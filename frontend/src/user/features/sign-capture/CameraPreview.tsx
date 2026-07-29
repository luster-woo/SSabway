import { useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/** 프레임 가이드 코너 브래킷 하나 */
function Corner({ position }: { position: string }) {
  return (
    <span
      aria-hidden
      className={`absolute size-7 border-white ${position}`}
    />
  )
}

export interface CameraPreviewProps {
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
  /** 촬영된 정지 이미지 URL. 있으면 video 대신 이미지를 보여준다. */
  capturedUrl: string | null
}

/** 카메라 프리뷰 + 표지판 프레임 가이드. 페이지 전체를 채운다. */
export function CameraPreview({
  stream,
  videoRef,
  capturedUrl,
}: CameraPreviewProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream, videoRef])

  return (
    <div className="absolute inset-0 bg-[#15181c]">
      {/* 스트림은 유지한 채 캡처본을 위에 덮는다 — 재촬영 시 즉시 복귀 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="size-full object-cover"
      />
      {capturedUrl ? (
        <img
          src={capturedUrl}
          alt={t('signCapture.capturedAlt')}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      {/* 상·하단 어둡게 — 프로토타입 s2의 오버레이 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-black/30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-black/40" />

      {/* 표지판 프레임 가이드 */}
      <div className="pointer-events-none absolute top-[26%] right-[7%] left-[7%] aspect-[330/160]">
        <Corner position="top-0 left-0 rounded-tl-md border-t-4 border-l-4" />
        <Corner position="top-0 right-0 rounded-tr-md border-t-4 border-r-4" />
        <Corner position="bottom-0 left-0 rounded-bl-md border-b-4 border-l-4" />
        <Corner position="bottom-0 right-0 rounded-br-md border-b-4 border-r-4" />
        {capturedUrl ? null : (
          <span
            aria-hidden
            className="absolute top-1/2 right-2 left-2 h-[3px] animate-pulse rounded-full bg-white/60"
          />
        )}
      </div>

      <p className="absolute inset-x-6 top-[62%] text-center text-[13px] text-[#c6d2da]">
        {t('signCapture.hint')}
      </p>
    </div>
  )
}
