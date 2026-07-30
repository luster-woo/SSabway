import { useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { MIN_ZOOM } from '@/user/features/sign-capture/hooks/usePinchZoom'

/** 프레임 가이드 코너 브래킷 하나 */
function Corner({ position }: { position: string }) {
  return (
    <span aria-hidden className={`absolute size-7 border-white ${position}`} />
  )
}

export interface CameraPreviewProps {
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
  /** 핀치 제스처를 받는 컨테이너 */
  containerRef: RefObject<HTMLDivElement | null>
  /** 촬영된 정지 이미지 URL. 있으면 video 대신 이미지를 보여준다. */
  capturedUrl: string | null
  /** 프리뷰에 적용할 디지털 줌 배율 */
  zoom: number
  onResetZoom: () => void
}

/** 카메라 프리뷰 + 표지판 프레임 가이드. 페이지 전체를 채운다. */
export function CameraPreview({
  stream,
  videoRef,
  containerRef,
  capturedUrl,
  zoom,
  onResetZoom,
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

  const isZoomed = zoom > MIN_ZOOM

  return (
    // touch-action-none: 핀치가 페이지 확대로 새지 않게 한다
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none bg-[#15181c]"
    >
      {/* 스트림은 유지한 채 캡처본을 위에 덮는다 — 재촬영 시 즉시 복귀 */}
      {/* 확대는 video에만 적용한다. 프레임 가이드·오버레이는 그대로 둔다. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="size-full origin-center object-cover will-change-transform"
        style={{ transform: `scale(${zoom})` }}
      />
      {/* 캡처본은 이미 줌 영역만 잘라 저장했으므로 배율을 다시 걸지 않는다 */}
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

      {/* 배율 표시 — 눌러서 원래 배율로 되돌린다 */}
      {isZoomed && !capturedUrl ? (
        <button
          type="button"
          onClick={onResetZoom}
          aria-label={t('signCapture.zoomReset')}
          className="absolute top-[calc(env(safe-area-inset-top,0px)+0.75rem)] left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[13px] font-bold text-white"
        >
          {zoom.toFixed(1)}×
        </button>
      ) : null}

      {/*
        안내 문구는 카메라 영상 위에 얹히므로 밝은 표지판을 비추면 글자가 묻힌다.
        어두운 알약형 배경을 깔아 영상 밝기와 무관하게 읽히도록 한다.
        pointer-events-none: 이 영역에서 시작한 핀치 제스처도 컨테이너가 받도록.
      */}
      <div className="pointer-events-none absolute inset-x-4 top-[62%] flex flex-col items-center gap-1.5 text-center">
        <p className="rounded-full bg-black/65 px-4 py-2 text-[14px] leading-snug font-bold text-white backdrop-blur-[2px]">
          {t('signCapture.hint')}
        </p>
      </div>
    </div>
  )
}
