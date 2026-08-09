import type {
  FaceDetector,
  FaceFrameResult,
} from '@/user/features/mosaic/types'

/**
 * 얼굴 검출 WebSocket.
 * 명세: Notion API 명세서 > AI > 얼굴 검출
 *
 *   URL   /ws/v1/ai/faces (같은 오리진 — dev 는 vite 의 '/ws/v1/ai' 프록시,
 *         배포는 deploy/nginx.conf 의 location /ws/v1/ai/ 가 ai:8000 으로 전달)
 *   송신  {frameId, timestamp, image(base64)} JSON
 *   수신  {frameId, timestamp, faces: [{x, y, width, height, confidence}]}
 */
function detectorUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws/v1/ai/faces`
}

/**
 * 재연결 백오프 상한(ms).
 *
 * 통화가 이어지는 한 절대 포기하지 않는다 — 예전엔 3회(≈6초) 만에 포기했는데,
 * 20초~1분씩 끊겼다 돌아오는 흔한 경우에 재시도가 이미 소진돼 소켓을 다시 열지
 * 못했다. 그러면 useFaceMosaic 이 전체 블러(protectAll)에 영영 갇힌다.
 *
 * 검출이 죽어 있는 동안은 파이프라인이 전체 블러로 안전하게 방어하므로,
 * 계속 재시도해도 미가림 영상이 새 나갈 위험은 없다. 백오프만 상한을 둬
 * 서버·네트워크를 과하게 두드리지 않는다. 소켓이 살아나 결과가 들어오면
 * useFaceMosaic 이 자동으로 얼굴 모자이크(active)로 복귀한다.
 */
const MAX_BACKOFF_MS = 8_000

export function createWsFaceDetector(): FaceDetector {
  let ws: WebSocket | null = null
  let stopped = false
  let retries = 0
  let reconnectTimer: number | undefined
  let onResultRef: ((result: FaceFrameResult) => void) | null = null

  function clearReconnectTimer() {
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
  }

  /** 백오프를 상한까지 지수로 늘리며 재연결을 예약한다. 이미 예약돼 있으면 무시. */
  function scheduleReconnect() {
    if (stopped || reconnectTimer !== undefined) return
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retries)
    retries += 1
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, delay)
  }

  function connect() {
    if (stopped || !onResultRef) return
    // 이미 살아 있거나 연결 중이면 새로 열지 않는다.
    // (online 이벤트와 백오프 타이머가 겹쳐 소켓이 둘 생기는 것을 막는다)
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const onResult = onResultRef
    ws = new WebSocket(detectorUrl())

    ws.onopen = () => {
      retries = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const msg = JSON.parse(event.data) as Partial<FaceFrameResult>
        if (typeof msg.frameId === 'number' && Array.isArray(msg.faces)) {
          onResult({ frameId: msg.frameId, faces: msg.faces })
        }
      } catch {
        // JSON 이 아닌 메시지는 버린다
      }
    }

    ws.onclose = () => {
      if (stopped) return
      // 포기하지 않는다. 백오프 상한까지만 늘리고 계속 재시도한다.
      scheduleReconnect()
    }
  }

  /**
   * 브라우저가 네트워크 복구를 알리면 백오프를 기다리지 않고 즉시 재연결한다.
   * 1분 단절이면 백오프가 이미 상한(8초)까지 자라 있어, 이게 없으면 복귀 후
   * 최대 8초 동안 전체 블러에 머문다. online 즉시 재연결로 그 지연을 없앤다.
   */
  function handleOnline() {
    if (stopped) return
    clearReconnectTimer()
    retries = 0
    connect()
  }

  return {
    start(onResult) {
      stopped = false
      retries = 0
      onResultRef = onResult
      window.addEventListener('online', handleOnline)
      connect()
    },
    detect(request) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(request))
    },
    stop() {
      stopped = true
      window.removeEventListener('online', handleOnline)
      clearReconnectTimer()
      ws?.close()
      ws = null
      onResultRef = null
    },
  }
}
