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

  function connect(
    onEvent: (event: CaptionEvent) => void,
    onError?: (error: Error) => void,
  ) {
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
      if (retries >= MAX_RETRIES) {
        onError?.(new Error('caption socket closed'))
        return
      }
      retries += 1
      // 즉시 재접속하면 서버가 아픈 동안 연타하게 된다. 점점 늦춘다.
      setTimeout(() => {
        if (!stopped) connect(onEvent, onError)
      }, 1000 * retries)
    }
  }

  return {
    start(onEvent, onError) {
      stopped = false
      connect(onEvent, onError)
    },
    sendChunk(pcm) {
      // Int16Array 자체가 BufferSource 다. .buffer 를 넘기면 타입이
      // ArrayBufferLike(SharedArrayBuffer 포함)로 넓어져 tsc 가 거부한다.
      if (ws?.readyState === WebSocket.OPEN) ws.send(pcm)
    },
    stop() {
      stopped = true
      ws?.close()
      ws = null
    },
  }
}
