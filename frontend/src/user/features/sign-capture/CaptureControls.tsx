import { useTranslation } from 'react-i18next'

export interface CaptureControlsProps {
  /** 촬영본을 분석 중이라 셔터를 누를 수 없는 상태 */
  disabled: boolean
  onCapture: () => void
}

/**
 * 하단 컨트롤 — 셔터 하나. 찍는 즉시 AI 분석으로 넘어간다.
 *
 * 예전에는 재촬영·셔터·AI 분석 세 버튼이었는데, 촬영과 분석을 나눌 이유가
 * 없어 셔터로 합쳤다. 재촬영은 분석 실패 모달의 [다시 촬영]이 담당한다.
 */
export function CaptureControls({ disabled, onCapture }: CaptureControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onCapture}
        disabled={disabled}
        aria-label={t('signCapture.shoot')}
        className="flex size-[72px] items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
      >
        <span className="block size-14 rounded-full bg-white active:scale-90" />
      </button>
    </div>
  )
}
