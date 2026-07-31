import { useEffect, useRef } from 'react'
import type { StreamManager } from 'openvidu-browser'

interface OpenViduVideoProps {
  streamManager: StreamManager
  /** 내 화면 미리보기는 음소거해야 한다. 안 그러면 자기 목소리가 되돌아온다. */
  muted?: boolean
  className?: string
}

/**
 * OpenVidu 스트림을 <video> 에 연결한다.
 *
 * srcObject 를 직접 넣지 않고 addVideoElement 를 쓰는 이유는, OpenVidu 가
 * 재연결 후 트랙을 교체할 때 이 엘리먼트를 다시 물려주기 때문이다.
 * 직접 붙이면 재연결 후 화면이 검게 멈춘다.
 */
export function OpenViduVideo({
  streamManager,
  muted = false,
  className,
}: OpenViduVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) streamManager.addVideoElement(videoRef.current)
  }, [streamManager])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  )
}
