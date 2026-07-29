import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { LoadingOverlay, MobileViewport, useToast } from '@/shared/ui'
import { CameraErrorNotice } from '@/user/features/sign-capture/CameraErrorNotice'
import { CameraPreview } from '@/user/features/sign-capture/CameraPreview'
import { CaptureControls } from '@/user/features/sign-capture/CaptureControls'
import {
  CAMERA_STATUS,
  useCameraStream,
} from '@/user/features/sign-capture/hooks/useCameraStream'
import { captureFrame } from '@/user/features/sign-capture/lib/captureFrame'

/** 분석 API 연동 전 로딩 연출용 지연 */
const FAKE_ANALYZE_MS = 1400

/** 인식 후 기본 이동 경로. 시작 화면에서 바로 들어온 경우다. */
const DEFAULT_NEXT_PATH = '/destination'

/** 다른 화면이 '출발지 변경'으로 보낼 때 넘겨주는 복귀 경로 */
interface SignCaptureState {
  returnTo?: string
}

/**
 * 2. 카메라 촬영 — 표지판을 찍어 현재 위치를 인식하는 화면.
 *
 * 안내 정보 확인 화면에서 '변경'으로 들어오면 state.returnTo가 실려 온다.
 * 이 경우 인식이 끝난 뒤 목적지 설정이 아니라 원래 화면으로 되돌아간다.
 */
export default function SignCapturePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const returnTo = (state as SignCaptureState | null)?.returnTo ?? null
  const { showToast } = useToast()
  const { status, errorType, stream, restart } = useCameraStream()

  const videoRef = useRef<HTMLVideoElement>(null)
  const capturedBlobRef = useRef<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 페이지를 떠날 때 object URL 정리
  useEffect(
    () => () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    },
    [capturedUrl],
  )

  const setCaptured = (blob: Blob) => {
    capturedBlobRef.current = blob
    setCapturedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(blob)
    })
  }

  const shoot = async () => {
    const video = videoRef.current
    if (!video || status !== CAMERA_STATUS.STREAMING || capturedUrl) return

    setIsFlashing(true)
    window.setTimeout(() => setIsFlashing(false), 350)
    try {
      setCaptured(await captureFrame(video))
    } catch {
      showToast(t('signCapture.captureFailed'))
    }
  }

  const retake = () => {
    if (!capturedUrl) {
      showToast(t('signCapture.needCaptureFirst'))
      return
    }
    URL.revokeObjectURL(capturedUrl)
    capturedBlobRef.current = null
    setCapturedUrl(null)
    showToast(t('signCapture.retaken'))
  }

  const analyze = () => {
    if (!capturedBlobRef.current) {
      showToast(t('signCapture.needCaptureFirst'))
      return
    }
    setIsAnalyzing(true)
    // TODO: capturedBlobRef.current 를 표지판 분석 API로 전송하고
    //       응답의 위치 정보를 스토어에 담은 뒤 다음 화면으로 이동
    window.setTimeout(() => {
      // 되돌아갈 때는 replace로 남겨 뒤로가기가 카메라 화면에 다시 걸리지 않게 한다.
      void navigate(returnTo ?? DEFAULT_NEXT_PATH, {
        replace: returnTo !== null,
      })
    }, FAKE_ANALYZE_MS)
  }

  return (
    <MobileViewport tone="dark" className="bg-[#15181c]">
      <CameraPreview
        stream={stream}
        videoRef={videoRef}
        capturedUrl={capturedUrl}
      />

      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => void navigate(returnTo ?? '/', { replace: true })}
        aria-label={t('signCapture.back')}
        className="absolute top-[calc(env(safe-area-inset-top,0px)+0.75rem)] left-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/35 text-2xl text-white"
      >
        ‹
      </button>

      {/* 하단 컨트롤 */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        <CaptureControls
          hasCapture={capturedUrl !== null}
          onRetake={retake}
          onCapture={() => void shoot()}
          onAnalyze={analyze}
        />
      </div>

      {/* 촬영 플래시 */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 bg-white transition-opacity duration-300 ${
          isFlashing ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {status === CAMERA_STATUS.ERROR && errorType ? (
        <CameraErrorNotice
          errorType={errorType}
          onRetry={restart}
          onSelectImage={setCaptured}
        />
      ) : null}

      {isAnalyzing ? (
        <LoadingOverlay message={t('signCapture.analyzing')} />
      ) : null}
    </MobileViewport>
  )
}
