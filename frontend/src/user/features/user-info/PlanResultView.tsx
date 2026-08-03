import { useTranslation } from 'react-i18next'

import type { RoutePlan } from '@/shared/types/guide'
import { CheckIcon } from '@/shared/ui'
import { getPlanMessage } from '@/user/features/user-info/lib/preferenceFlow'

export interface PlanResultViewProps {
  plan: RoutePlan
  /** 첫 질문부터 다시 답한다. */
  onReset: () => void
}

/** 답변이 끝나 확정된 경유 계획을 보여준다. */
export function PlanResultView({ plan, onReset }: PlanResultViewProps) {
  const { t } = useTranslation()
  const message = getPlanMessage(plan)

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <span
        aria-hidden
        className="bg-success flex size-[54px] items-center justify-center rounded-full text-white"
      >
        <CheckIcon className="size-7" strokeWidth={2.8} />
      </span>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-ink text-[clamp(16px,4.8vw,18px)] font-extrabold">
          {t(message.titleKey)}
        </p>
        <p className="text-ink-muted text-[13px]">
          {t(message.descriptionKey)}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="bg-surface-muted text-ink-muted focus-visible:ring-brand mt-1 h-10 rounded-full px-5 text-[13.5px] font-bold transition hover:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
      >
        {t('userInfo.preference.reset')}
      </button>
    </div>
  )
}
