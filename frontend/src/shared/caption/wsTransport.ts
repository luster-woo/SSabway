import type {
  CaptionEvent,
  CaptionSessionConfig,
  CaptionTransport,
} from '@/shared/caption/types'

/**
 * 실시간 번역 자막 WebSocket.
 * 명세: Notion API 명세서 > AI > 실시간 번역 자막 생성
 *
 *   URL     /ws/v1/ai/translation (같은 오리진 — dev 는 vite 프록시,
 *           배포는 deploy/nginx.conf 의 location /ws/v1/ai/ 가 ai:8000 으로 전달)
 *   송신    ① 연결 직후 세션 설정 JSON 1건 (speaker/sourceLanguage/targetLanguage)
 *           ② 이후 binary frame — 16kHz mono PCM16 (pcmStreamer)
 *   수신    {speaker, type: 'INTERIM'|'FINAL', sourceLanguage, targetLanguage,
 *            sourceText, translatedText, timestamp}
 */
function captionUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws/v1/ai/translation`
}

/** 서버 응답 형태 (명세의 Response) */
interface CaptionMessage {
  type?: string
  sourceText?: string
  translatedText?: string
  sourceLanguage?: string
}

/** 상담 중 순간 단절 대비. 이 횟수를 넘기면 자막만 조용히 포기한다. */
const MAX_RETRIES = 3

export function createWsCaptionTransport(
  config: CaptionSessionConfig,
): CaptionTransport {
  let ws: WebSocket | null = null
  let stopped = false
  let retries = 0

  // start() 로 받은 콜백. 재연결(onclose·복귀)에서 다시 connect 할 때 쓴다.
  let onEventCb: ((event: CaptionEvent) => void) | null = null
  let onErrorCb: ((error: Error) => void) | undefined

  function isLive(): boolean {
    return (
      ws !== null &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    )
  }

  function connect() {
    if (onEventCb === null) return
    const onEvent = onEventCb
    const onError = onErrorCb

    ws = new WebSocket(captionUrl())
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      retries = 0
      // 세션 설정은 연결(재연결 포함)마다 다시 보내야 한다 —
      // 서버는 소켓 단위로 화자·언어를 기억한다.
      ws?.send(JSON.stringify(config))
    }

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const msg = JSON.parse(event.data) as CaptionMessage
        // INTERIM/FINAL 외 type 은 무시한다 — 서버가 메시지를 추가해도
        // 구버전 프론트가 깨지지 않게 하는 확장 여지다.
        if (
          (msg.type === 'INTERIM' || msg.type === 'FINAL') &&
          typeof msg.translatedText === 'string'
        ) {
          onEvent({
            text: msg.translatedText,
            final: msg.type === 'FINAL',
            sourceText: msg.sourceText,
            sourceLang: msg.sourceLanguage,
          })
        }
      } catch {
        // JSON 이 아닌 메시지는 버린다
      }
    }

    ws.onclose = () => {
      if (stopped) return

      /*
        백그라운드에서 끊긴 것은 재시도 예산에서 뺀다.

        OS 는 숨긴 탭의 WebSocket 을 닫는데, 이것을 MAX_RETRIES 로 세면
        앱을 잠깐 전환한 것만으로 예산이 소진돼, 복귀해도 자막이 영영 죽는다.
        숨은 동안은 재연결도 미루고(어차피 스로틀되고 오디오도 suspend 다),
        복귀 시 onVisibilityChange 가 예산을 되돌려 다시 연결한다.
      */
      if (document.hidden) return

      if (retries >= MAX_RETRIES) {
        onError?.(new Error('caption socket closed'))
        return
      }
      retries += 1
      // 즉시 재접속하면 서버가 아픈 동안 연타하게 된다. 점점 늦춘다.
      setTimeout(() => {
        if (!stopped && !isLive()) connect()
      }, 1000 * retries)
    }
  }

  /*
    백그라운드에서 돌아오면 재연결한다.

    숨은 동안 소켓이 닫혔어도 위 onclose 가 예산을 쓰지 않고 물러나 있으므로,
    복귀 시 예산을 0 으로 되돌리고 새로 연결한다. 이미 살아 있으면 둔다.
  */
  const onVisibilityChange = () => {
    if (stopped) return
    if (document.visibilityState !== 'visible') return
    if (isLive()) return
    retries = 0
    connect()
  }

  return {
    start(onEvent, onError) {
      stopped = false
      onEventCb = onEvent
      onErrorCb = onError
      document.addEventListener('visibilitychange', onVisibilityChange)
      connect()
    },
    sendChunk(pcm) {
      // Int16Array 자체가 BufferSource 다. .buffer 를 넘기면 타입이
      // ArrayBufferLike(SharedArrayBuffer 포함)로 넓어져 tsc 가 거부한다.
      if (ws?.readyState === WebSocket.OPEN) ws.send(pcm)
    },
    stop() {
      stopped = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      ws?.close()
      ws = null
    },
  }
}
