import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  Button,
  Dialog,
  LoadingOverlay,
  MobileViewport,
  useToast,
} from '@/shared/ui'
import { CameraErrorNotice } from '@/user/features/sign-capture/CameraErrorNotice'
import { CameraPreview } from '@/user/features/sign-capture/CameraPreview'
import { CaptureControls } from '@/user/features/sign-capture/CaptureControls'
import {
  CAMERA_STATUS,
  useCameraStream,
} from '@/user/features/sign-capture/hooks/useCameraStream'
import { usePinchZoom } from '@/user/features/sign-capture/hooks/usePinchZoom'
import { captureFrame } from '@/user/features/sign-capture/lib/captureFrame'
import {
  predictSign,
  type SignPrediction,
} from '@/user/features/sign-capture/lib/predictSign'
import { toOriginStation } from '@/shared/lib/stationCoords'
import {
  ORIGIN_SOURCE,
  useOriginStationStore,
} from '@/shared/lib/store/useOriginStationStore'
import { useStationNodeStore } from '@/shared/lib/store/useStationNodeStore'
import {
  toErrorKey,
  type ErrorKeyTable,
} from '@/user/features/auth/lib/mockHttpError'

/** 인식 후 기본 이동 경로. 시작 화면에서 바로 들어온 경우다. */
const DEFAULT_NEXT_PATH = '/destination'

/**
 * 표지판 인식 실패를 사유별 문구로 가른다(모달 설명). code 를 먼저 본다.
 *   AI_SIGN_NOT_DETECTED  404 사진에서 표지판을 못 찾음
 *   AI_IMAGE_TOO_LARGE    413 용량 초과(15MB)
 *   AI_IMAGE_INVALID/REQUIRED 400 이미지 자체를 못 읽음
 *   AI_SERVER_ERROR       502 인식 서버 일시 장애
 * code 가 없는 실패(200 봉투 실패·네트워크)는 fallback(일반 실패 문구)로 둔다.
 */
const PREDICT_ERROR_KEY: ErrorKeyTable = {
  byCode: {
    AI_SIGN_NOT_DETECTED: 'signCapture.predictFail.notDetected',
    AI_IMAGE_TOO_LARGE: 'signCapture.predictFail.tooLarge',
    AI_IMAGE_INVALID: 'signCapture.predictFail.invalidImage',
    AI_IMAGE_REQUIRED: 'signCapture.predictFail.invalidImage',
    AI_SERVER_ERROR: 'signCapture.predictFail.serverError',
  },
}
const PREDICT_FALLBACK_KEY = 'signCapture.analyzeFailedDescription'

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
  const setStartPoint = useStationNodeStore((s) => s.setStartPoint)
  const setOriginStation = useOriginStationStore((s) => s.setOriginStation)

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const capturedBlobRef = useRef<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalyzeFailed, setIsAnalyzeFailed] = useState(false)
  // 분석 실패 모달에 띄울 설명의 i18n 키. code 로 사유가 갈린다.
  const [analyzeFailedKey, setAnalyzeFailedKey] = useState(
    PREDICT_FALLBACK_KEY,
  )
  // 인식은 됐지만 확신도가 낮아(confident=false) 그대로 진행하기 위험한 경우
  const [isLowConfidence, setIsLowConfidence] = useState(false)

  // 촬영본을 보여주는 동안에는 확대해도 반영되지 않으므로 제스처를 끈다
  const { zoom, resetZoom } = usePinchZoom(previewRef, capturedUrl === null)

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
      // 화면에 보이는 만큼만 잘라 담기 위해 현재 배율을 함께 넘긴다
      setCaptured(await captureFrame(video, zoom))
    } catch {
      showToast(t('signCapture.captureFailed'))
    }
  }

  /** 촬영본을 버리고 카메라 프리뷰로 되돌린다 (재촬영·분석 실패 공용) */
  const clearCapture = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    capturedBlobRef.current = null
    setCapturedUrl(null)
  }

  const retake = () => {
    if (!capturedUrl) {
      showToast(t('signCapture.needCaptureFirst'))
      return
    }
    clearCapture()
    showToast(t('signCapture.retaken'))
  }

  const analyze = async () => {
    if (!capturedBlobRef.current) {
      showToast(t('signCapture.needCaptureFirst'))
      return
    }
    setIsAnalyzing(true)

    /*
      인식 결과의 signageId 를 역 내 출발 노드로, stationName 을 지하철 경로의
      출발지(originStation)로 스토어에 담는다.
        - signageId → /routes/navi 의 startPoint. 담지 않으면 resolveStationNodes
          가 파일럿 기본값(EX0_01)으로 폴백해 어디를 찍든 같은 지점에서 출발한다.
        - stationName → originStation. GPS 를 걷어낸 뒤로 출발지는 이 값이 정한다.
          목적지 지도의 출발지 점과 /routes/path 의 startX/Y 가 여기서 나온다.

      요청 실패 / 확신도 낮음 / 성공 세 갈래로 나눈다. 실패·저확신은 촬영본을
      그대로 둔 채 모달로 알리고, confident 인 경우에만 다음 화면으로 넘어간다.
      틀린 위치로 안내를 시작하는 것이 최악이라, confident=false 는 진행하지 않는다.
      (candidates 로 후보를 고르게 하는 UX 는 노드 표시명이 준비되면 붙인다.)
    */
    let prediction: SignPrediction
    try {
      prediction = await predictSign(capturedBlobRef.current)
    } catch (error) {
      // 토스트는 금방 사라져 원인을 놓치기 쉽다 — 재촬영을 유도하는
      // 모달로 띄운다 (버튼이 촬영본을 지우고 카메라로 되돌린다).
      // 설명은 실패 code 에 맞춰 갈린다(표지판 못 찾음·용량 초과·서버 장애 등).
      setIsAnalyzing(false)
      setAnalyzeFailedKey(
        toErrorKey(error, PREDICT_ERROR_KEY, PREDICT_FALLBACK_KEY),
      )
      setIsAnalyzeFailed(true)
      return
    }

    // confident=false(확신도 낮음) 이거나 signageId 가 비면 그대로 진행하지 않는다.
    if (prediction.confident === false || !prediction.signageId) {
      setIsAnalyzing(false)
      setIsLowConfidence(true)
      return
    }

    setStartPoint(prediction.signageId)

    // 인식한 역을 출발지로 담는다. 좌표는 stationCoords 로 붙인다.
    // (표지판이 역 이름을 못 주는 예외 상황이면 출발지는 기존 값을 유지한다)
    if (prediction.stationName) {
      setOriginStation(
        toOriginStation(prediction.stationName),
        ORIGIN_SOURCE.SIGN,
      )
    }

    // 되돌아갈 때는 replace로 남겨 뒤로가기가 카메라 화면에 다시 걸리지 않게 한다.
    void navigate(returnTo ?? DEFAULT_NEXT_PATH, {
      replace: returnTo !== null,
    })
  }

  return (
    <MobileViewport tone="dark" className="bg-[#15181c]">
      <CameraPreview
        stream={stream}
        videoRef={videoRef}
        containerRef={previewRef}
        capturedUrl={capturedUrl}
        zoom={zoom}
        onResetZoom={resetZoom}
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
          onAnalyze={() => void analyze()}
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

      {isAnalyzeFailed ? (
        <Dialog
          title={t('signCapture.analyzeFailedTitle')}
          description={t(analyzeFailedKey)}
        >
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              setIsAnalyzeFailed(false)
              clearCapture()
            }}
          >
            {t('signCapture.analyzeFailedRetake')}
          </Button>
        </Dialog>
      ) : null}

      {isLowConfidence ? (
        <Dialog
          title={t('signCapture.lowConfidenceTitle')}
          description={t('signCapture.lowConfidenceDescription')}
        >
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              setIsLowConfidence(false)
              clearCapture()
            }}
          >
            {t('signCapture.analyzeFailedRetake')}
          </Button>
        </Dialog>
      ) : null}
    </MobileViewport>
  )
}
