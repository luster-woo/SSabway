import { useCallback, useEffect, useRef, useState } from 'react'

export const CAMERA_STATUS = {
  IDLE: 'IDLE',
  REQUESTING: 'REQUESTING',
  STREAMING: 'STREAMING',
  ERROR: 'ERROR',
} as const
export type CameraStatus = (typeof CAMERA_STATUS)[keyof typeof CAMERA_STATUS]

export const CAMERA_ERROR = {
  /** http 접속 등 비보안 컨텍스트 — mediaDevices 자체가 없다 */
  INSECURE_CONTEXT: 'INSECURE_CONTEXT',
  /** 사용자가 권한을 거부했거나 브라우저 정책으로 차단됨 */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** 사용 가능한 카메라가 없음 */
  NOT_FOUND: 'NOT_FOUND',
  /** 다른 앱·탭이 카메라를 점유 중 */
  IN_USE: 'IN_USE',
  UNKNOWN: 'UNKNOWN',
} as const
export type CameraErrorType = (typeof CAMERA_ERROR)[keyof typeof CAMERA_ERROR]

function classifyCameraError(error: unknown): CameraErrorType {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return CAMERA_ERROR.PERMISSION_DENIED
      case 'NotFoundError':
      case 'OverconstrainedError':
        return CAMERA_ERROR.NOT_FOUND
      case 'NotReadableError':
      case 'AbortError':
        return CAMERA_ERROR.IN_USE
    }
  }
  return CAMERA_ERROR.UNKNOWN
}

export interface UseCameraStreamResult {
  status: CameraStatus
  errorType: CameraErrorType | null
  stream: MediaStream | null
  /** 에러 후 재시도용. 마운트 시에는 자동으로 시작된다. */
  restart: () => void
}

/**
 * 후면 카메라 스트림을 연다.
 *
 * - facingMode는 exact가 아닌 ideal — 후면 카메라가 없는 노트북에서도
 *   전면 웹캠으로 폴백되어 동일한 코드 경로를 테스트할 수 있다.
 * - 언마운트 시 트랙을 반드시 정리한다(카메라 점유 해제).
 */
export function useCameraStream(): UseCameraStreamResult {
  const [status, setStatus] = useState<CameraStatus>(CAMERA_STATUS.IDLE)
  const [errorType, setErrorType] = useState<CameraErrorType | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // stop 이후 뒤늦게 resolve된 getUserMedia 결과를 버리기 위한 세대 카운터.
  // (StrictMode 이중 마운트에서 카메라가 계속 점유되는 레이스 방지)
  const generationRef = useRef(0)

  const stop = useCallback(() => {
    generationRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorType(
        window.isSecureContext
          ? CAMERA_ERROR.UNKNOWN
          : CAMERA_ERROR.INSECURE_CONTEXT,
      )
      setStatus(CAMERA_STATUS.ERROR)
      return
    }

    setStatus(CAMERA_STATUS.REQUESTING)
    setErrorType(null)
    const generation = generationRef.current
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      // 요청 중 stop이 호출됐다면(언마운트 등) 받은 스트림을 즉시 반납
      if (generation !== generationRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = mediaStream
      setStream(mediaStream)
      setStatus(CAMERA_STATUS.STREAMING)
    } catch (error) {
      if (generation !== generationRef.current) return
      setErrorType(classifyCameraError(error))
      setStatus(CAMERA_STATUS.ERROR)
    }
  }, [])

  const restart = useCallback(() => {
    stop()
    void start()
  }, [start, stop])

  useEffect(() => {
    void start()
    return stop
  }, [start, stop])

  return { status, errorType, stream, restart }
}
