import { useEffect, useState } from 'react'
import type { StreamManager } from 'openvidu-browser'

/**
 * OpenVidu StreamManager 에서 실제 MediaStream 을 꺼낸다.
 *
 * ⚠️ `manager.stream.getMediaStream()` 을 useMemo 로 감싸면 안 된다.
 *
 *    session.subscribe() 는 Subscriber 객체를 즉시 돌려주지만, 그 안의
 *    MediaStream 은 WebRTC 협상이 끝난 뒤에야 붙는다. 구독 직후에 부르면
 *    undefined 가 나온다. 그런데 Subscriber 의 객체 참조는 끝까지 그대로라,
 *    useMemo(..., [subscriber]) 는 다시 계산되지 않고 undefined 에 고정된다.
 *
 *    이 때문에 실시간 번역 자막이 양쪽 화면 모두에서 시작조차 하지 못했다 —
 *    useLiveCaption 이 stream 을 못 받아 소켓을 아예 만들지 않았다.
 *
 * 트랙이 붙는 순간을 streamPlaying 이벤트로 잡고, 이벤트를 놓치는 경우
 * (엘리먼트 부착 시점 차이 등)를 대비해 짧게 폴링도 같이 건다. 스트림을
 * 한 번 얻으면 폴링은 멈춘다.
 */
export function useRemoteMediaStream(
  manager: StreamManager | null,
): MediaStream | null {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (!manager) {
      setMediaStream(null)
      return
    }

    let done = false

    /** 쓸 수 있는 스트림이면 채택하고 true */
    const adopt = (): boolean => {
      if (done) return true
      const next = manager.stream.getMediaStream()
      // 오디오 트랙이 없으면 자막이 아무것도 못 뽑는다. 붙을 때까지 기다린다.
      if (!next || next.getAudioTracks().length === 0) return false
      done = true
      setMediaStream(next)
      return true
    }

    if (adopt()) return

    const onPlaying = () => {
      adopt()
    }
    manager.on('streamPlaying', onPlaying)

    const timer = window.setInterval(() => {
      if (adopt()) window.clearInterval(timer)
    }, 300)

    return () => {
      done = true
      window.clearInterval(timer)
      manager.off('streamPlaying', onPlaying)
    }
  }, [manager])

  return mediaStream
}
