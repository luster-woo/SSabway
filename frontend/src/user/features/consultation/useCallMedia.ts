import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CAMERA_ERROR,
  type CameraErrorType,
} from '@/user/features/sign-capture/hooks/useCameraStream'

/** 권한 요청 흐름의 단계 */
export const CALL_MEDIA_STATUS = {
  /** 아직 요청하지 않음 — 안내 모달을 띄운다 */
  IDLE: 'IDLE',
  /** 브라우저 권한 팝업이 떠 있는 중 */
  REQUESTING: 'REQUESTING',
  /** 스트림 확보 */
  STREAMING: 'STREAMING',
  ERROR: 'ERROR',
} as const

export type CallMediaStatus =
  (typeof CALL_MEDIA_STATUS)[keyof typeof CALL_MEDIA_STATUS]

/**
 * 오류 분류는 sign-capture 의 CAMERA_ERROR 를 그대로 쓴다.
 * getUserMedia 가 던지는 DOMException 종류가 같아 새로 정의할 이유가 없다.
 */
function classifyMediaError(error: unknown): CameraErrorType {
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

export interface UseCallMediaResult {
  status: CallMediaStatus
  errorType: CameraErrorType | null
  stream: MediaStream | null
  isMicOn: boolean
  isCameraOn: boolean
  /** 권한 안내 모달의 [허용] 이 부른다. 브라우저 팝업은 이때 뜬다. */
  start: () => Promise<void>
  toggleMic: () => void
  toggleCamera: () => void
  stop: () => void
}

/**
 * 화상 통화용 후면 카메라 + 마이크 스트림.
 *
 * sign-capture 의 useCameraStream 과 나뉘는 이유는 두 가지다.
 * - 통화는 마이크가 필요하다. 오디오를 따로 요청하면 권한 팝업이 두 번 뜬다.
 * - 마운트 즉시 시작하지 않는다. 프로토타입처럼 먼저 왜 필요한지 안내하고
 *   [허용] 을 눌렀을 때 요청한다.
 *
 * 오류 분류(CAMERA_ERROR)와 i18n 키(signCapture.error.*)는 재사용한다.
 *
 * 여기서 얻은 스트림을 useConsultationCall 이 OpenVidu 로 발행한다.
 * TODO: 모자이크는 canvas 로 가공한 스트림을 발행해야 하므로 경로가 한 겹 늘어난다.
 *       그때 이 훅의 stream 과 발행용 stream 이 갈린다.
 */
export function useCallMedia(): UseCallMediaResult {
  const [status, setStatus] = useState<CallMediaStatus>(CALL_MEDIA_STATUS.IDLE)
  const [errorType, setErrorType] = useState<CameraErrorType | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)

  const streamRef = useRef<MediaStream | null>(null)
  // stop 이후 뒤늦게 resolve된 getUserMedia 결과를 버리기 위한 세대 카운터.
  // (StrictMode 이중 마운트에서 장치가 계속 점유되는 레이스 방지)
  const generationRef = useRef(0)

  const stop = useCallback(() => {
    generationRef.current += 1
    streamRef.current?.getTracks().forEach((track) => {
      track.stop()
    })
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
      setStatus(CALL_MEDIA_STATUS.ERROR)
      return
    }

    setStatus(CALL_MEDIA_STATUS.REQUESTING)
    setErrorType(null)
    const generation = generationRef.current

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        // exact 가 아닌 ideal — 후면 카메라가 없는 노트북에서도 웹캠으로 폴백된다.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      })

      // 요청 중 stop 이 호출됐다면(언마운트 등) 받은 스트림을 즉시 반납
      if (generation !== generationRef.current) {
        mediaStream.getTracks().forEach((track) => {
          track.stop()
        })
        return
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsMicOn(true)
      setIsCameraOn(true)
      setStatus(CALL_MEDIA_STATUS.STREAMING)
    } catch (error) {
      if (generation !== generationRef.current) return
      setErrorType(classifyMediaError(error))
      setStatus(CALL_MEDIA_STATUS.ERROR)
    }
  }, [])

  /**
   * 트랙의 enabled 만 끈다. track.stop() 을 쓰면 장치가 해제되어
   * 다시 켤 때 권한 팝업이 또 뜬다.
   */
  const toggleMic = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? []
    if (tracks.length === 0) return

    const next = !tracks[0].enabled
    tracks.forEach((track) => {
      track.enabled = next
    })
    setIsMicOn(next)
  }, [])

  const toggleCamera = useCallback(() => {
    const tracks = streamRef.current?.getVideoTracks() ?? []
    if (tracks.length === 0) return

    const next = !tracks[0].enabled
    tracks.forEach((track) => {
      track.enabled = next
    })
    setIsCameraOn(next)
  }, [])

  // 화면을 벗어나면 카메라 표시등이 켜진 채로 남지 않게 정리한다.
  useEffect(() => stop, [stop])

  return {
    status,
    errorType,
    stream,
    isMicOn,
    isCameraOn,
    start,
    toggleMic,
    toggleCamera,
    stop,
  }
}
