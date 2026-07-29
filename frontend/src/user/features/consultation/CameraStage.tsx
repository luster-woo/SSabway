import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface CameraStageProps {
  stream: MediaStream | null
  isCameraOn: boolean
}

/**
 * 후면 카메라 화면.
 *
 * 실제 카메라 스트림을 그대로 보여준다. 모자이크는 아직 붙이지 않았다.
 * TODO: 얼굴 검출 결과를 받아 canvas 에 모자이크를 그린 뒤 그 스트림을 publish 한다.
 *       그때 이 video 는 canvas 의 원본 소스로만 쓰이고 화면에는 canvas 를 띄운다.
 */
export function CameraStage({ stream, isCameraOn }: CameraStageProps) {
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
    <div className="absolute inset-0 bg-[#3B434C]">
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
