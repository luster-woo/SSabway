import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

export interface CameraStageProps {
  stream: MediaStream | null
  isCameraOn: boolean
  /**
   * 영상이 실제로 잘리는 박스를 밖에서 재기 위한 참조.
   *
   * 아래 `<video>` 는 이 박스를 `object-cover` 로 채우므로, 잘려 나가는 범위는
   * 이 박스의 가로:세로 비율 하나로 정해진다. 역무원 화면이 같은 화각을
   * 보여주려면 그 비율을 알아야 한다 — usePublishViewportAspect 가 이 참조를
   * 받아 재서 보낸다.
   *
   * `<video>` 가 아니라 감싸는 div 에 단다. video 는 스트림이 생긴 뒤에야
   * 렌더되므로 권한 대기 구간에서 참조가 비어 버린다.
   */
  boxRef?: RefObject<HTMLDivElement | null>
}

/**
 * 후면 카메라 화면.
 *
 * 여기 보이는 것은 **원본**이다. 모자이크(useFaceMosaic)는 역무원에게 전송되는
 * 스트림에만 적용한다 — 팀 결정 8/4. 발행은 mosaic.stream 이라 원본 영상이
 * 기기 밖으로 나가지는 않는다. 자세한 배선은 ConsultationPage 주석 참고.
 */
export function CameraStage({ stream, isCameraOn, boxRef }: CameraStageProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <div ref={boxRef} className="absolute inset-0 bg-[#3B434C]">
      {stream ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- 실시간 카메라라 자막 트랙이 없다 */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="size-full object-cover"
        />
      ) : null}

      {/* 카메라를 끄면 영상만 가리고 스트림은 유지한다. */}
      {!isCameraOn ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#3B434C]">
          <p className="text-[13px] font-bold text-white/60">
            {t('consultation.video.cameraOff')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
