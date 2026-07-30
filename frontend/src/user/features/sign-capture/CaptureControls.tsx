import { useTranslation } from 'react-i18next'

export interface CaptureControlsProps {
  /** 촬영된 이미지가 있는 상태(재촬영·분석 가능) */
  hasCapture: boolean
  onRetake: () => void
  onCapture: () => void
  onAnalyze: () => void
}

/** 하단 컨트롤: 재촬영 · 셔터 · AI 분석 (프로토타입 s2) */
export function CaptureControls({
  hasCapture,
  onRetake,
  onCapture,
  onAnalyze,
}: CaptureControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 items-center justify-items-center">
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onRetake}
          aria-label={t('signCapture.retake')}
          className="flex size-[52px] items-center justify-center rounded-full border border-[#3a424c] bg-[#20262e]/80 text-xl text-white active:brightness-125"
        >
          ↺
        </button>
        <span className="text-[11px] text-[#aebac4]">
          {t('signCapture.retake')}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onCapture}
          disabled={hasCapture}
          aria-label={t('signCapture.shoot')}
          className="flex size-[72px] items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
        >
          <span className="block size-14 rounded-full bg-white active:scale-90" />
        </button>
        <span className="text-[11px] text-[#aebac4]">
          {t('signCapture.shoot')}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onAnalyze}
          className="bg-brand-gradient rounded-2xl px-6 py-3 text-[14.5px] font-bold text-white active:brightness-110"
        >
          Analyze
        </button>
        <span className="text-[11px] text-[#aebac4]">
          {t('signCapture.analyze')}
        </span>
      </div>
    </div>
  )
}
