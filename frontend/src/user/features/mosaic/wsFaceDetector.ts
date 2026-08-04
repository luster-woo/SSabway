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

/** 통화 중 순간 단절 대비. 넘기면 포기한다 — 그동안 파이프라인이 전체 블러로 방어한다 */
const MAX_RETRIES = 3

export function createWsFaceDetector(): FaceDetector {
  let ws: WebSocket | null = null
  let stopped = false
  let retries = 0

  function connect(
    onResult: (result: FaceFrameResult) => void,
    onError?: (error: Error) => void,
  ) {
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
      if (retries >= MAX_RETRIES) {
        onError?.(new Error('face detector socket closed'))
        return
      }
      retries += 1
      setTimeout(() => {
        if (!stopped) connect(onResult, onError)
      }, 1000 * retries)
    }
  }

  return {
    start(onResult, onError) {
      stopped = false
      connect(onResult, onError)
    },
    detect(request) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(request))
    },
    stop() {
      stopped = true
      ws?.close()
      ws = null
    },
  }
}
