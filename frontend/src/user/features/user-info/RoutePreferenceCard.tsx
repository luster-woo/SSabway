import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PREFERENCE_STEP, type PreferenceStep } from '@/shared/types/guide'
import { Card, SelectableTile } from '@/shared/ui'
import { PlanResultView } from '@/user/features/user-info/PlanResultView'
import { StepDots } from '@/user/features/user-info/StepDots'
import {
  ChecklistIcon,
  ChevronLeftIcon,
  ElevatorIcon,
  TransitCardIcon,
  WonIcon,
} from '@/user/features/user-info/icons'
import {
  getQuestion,
  type PreferenceChoice,
  type PreferenceNode,
} from '@/user/features/user-info/lib/preferenceFlow'

/**
 * 질문마다 머리에 올리는 아이콘.
 *
 * 52px 원 안에 24px 아이콘을 넣으면 여백이 너무 많아 존재감이 약하다.
 * 28px(size-7)이 원의 지름 대비 비율이 맞는다.
 */
const STEP_ICON: Record<PreferenceStep, ReactNode> = {
  [PREFERENCE_STEP.ELEVATOR]: <ElevatorIcon className="size-7" />,
  [PREFERENCE_STEP.CARD_READY]: <TransitCardIcon className="size-7" />,
  [PREFERENCE_STEP.PREPARATION]: <ChecklistIcon className="size-7" />,
  [PREFERENCE_STEP.CASH]: <WonIcon className="size-7" />,
}

const QUESTION_ID = 'route-preference-question'

export interface RoutePreferenceCardProps {
  node: PreferenceNode
  activeIndex: number
  stepCount: number
  canGoBack: boolean
  onSelect: (choice: PreferenceChoice) => void
  onBack: () => void
  onReset: () => void
}

/**
 * '경로에 필요한 정보'를 한 번에 한 질문씩 묻는 카드.
 *
 * 답을 고르면 다음 질문으로 넘어가고, 더 물을 게 없으면 경유 계획을 보여준다.
 * 카드 높이가 질문마다 달라 화면이 출렁이므로 최소 높이를 잡아 둔다.
 */
export function RoutePreferenceCard({
  node,
  activeIndex,
  stepCount,
  canGoBack,
  onSelect,
  onBack,
  onReset,
}: RoutePreferenceCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="flex min-h-[268px] flex-col gap-4 py-4">
      {/* 되돌아가기와 진행 표시가 한 줄. 점은 버튼 유무와 관계없이 가운데 고정. */}
      <div className="relative flex h-6 items-center">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-ink-muted focus-visible:ring-brand -ml-1 flex items-center gap-0.5 rounded-full px-1 text-[12.5px] font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeftIcon className="size-3.5" strokeWidth={2.4} />
            {t('userInfo.preference.back')}
          </button>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <StepDots
            activeIndex={activeIndex}
            count={stepCount}
            label={
              // 결과 화면은 답한 질문 수와 무관하게 마지막 점을 채우므로
              // 스크린리더에는 "질문 4 / 4" 대신 완료 문구를 읽어 준다.
              node.kind === 'result'
                ? t('userInfo.preference.done')
                : t('userInfo.preference.progress', {
                    current: activeIndex + 1,
                    total: stepCount,
                  })
            }
          />
        </div>
      </div>

      {node.kind === 'result' ? (
        <PlanResultView plan={node.plan} onReset={onReset} />
      ) : (
        <div className="flex flex-1 flex-col items-center gap-3">
          <span
            aria-hidden
            className="bg-surface-muted text-brand-dark flex size-[52px] items-center justify-center rounded-full"
          >
            {STEP_ICON[node.step]}
          </span>

          <p
            id={QUESTION_ID}
            className="text-ink mb-1 text-center text-[clamp(15px,4.6vw,17px)] font-extrabold"
          >
            {t(getQuestion(node).questionKey)}
          </p>

          {/* SelectableTile이 aria-pressed를 쓰므로 radiogroup 대신 group으로 묶는다. */}
          <div
            role="group"
            aria-labelledby={QUESTION_ID}
            className="flex w-full flex-col gap-2"
          >
            {getQuestion(node).choices.map((choice) => (
              <SelectableTile
                key={choice.labelKey}
                selected={false}
                showCheck={false}
                label={t(choice.labelKey)}
                onClick={() => onSelect(choice)}
                className="justify-center"
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
