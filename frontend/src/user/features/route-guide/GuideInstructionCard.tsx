import { useTranslation } from 'react-i18next'

export interface GuideInstructionCardProps {
  /** 이번 단계에서 해야 할 행동 */
  instruction: string
}

/** 이번 단계 지시문. 위쪽 띠는 '경로 안내'라는 것을 알려주는 라벨이다. */
export function GuideInstructionCard({
  instruction,
}: GuideInstructionCardProps) {
  const { t } = useTranslation()

  return (
    <div className="border-line bg-surface overflow-hidden rounded-[20px] border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="bg-brand-gradient px-4 py-2.5 text-[11.5px] font-bold text-white">
        {t('routeGuide.label')}
      </p>

      {/* 지시문은 화면에서 가장 먼저 읽혀야 하는 정보다. */}
      <p
        aria-live="polite"
        className="text-ink px-4 py-4 text-[clamp(15px,4.6vw,17px)] leading-snug font-bold"
      >
        {instruction}
      </p>
    </div>
  )
}
