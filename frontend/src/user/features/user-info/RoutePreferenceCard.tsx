import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PREFERENCE_STEP,
  type PreferenceStep,
  type RoutePreference,
} from '@/shared/types/guide'
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
  /** 질문별로 마지막에 고른 답. 되돌아왔을 때 그 선택지를 하이라이트한다. */
  recalledAnswers: RoutePreference
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
  recalledAnswers,
  onSelect,
  onBack,
  onReset,
}: RoutePreferenceCardProps) {
  const { t } = useTranslation()

  /** 이 선택지가 이전에 고른 답인지. patch 의 필드 값이 기억한 답과 같으면 참. */
  const isRecalled = (choice: PreferenceChoice) =>
    Object.entries(choice.patch).every(
      ([field, value]) =>
        recalledAnswers[field as keyof RoutePreference] === value,
    )

  return (
    <Card className="flex min-h-[268px] flex-col gap-4 py-4">
      {/* 되돌아가기와 진행 표시가 한 줄. 점은 버튼 유무와 관계없이 가운데 고정. */}
      <div className="relative flex h-8 items-center">
        {canGoBack ? (
          // 카메라 화면 뒤로가기와 같은 원형 아이콘 버튼. 문구는 aria-label 로 남긴다.
          <button
            type="button"
            onClick={onBack}
            aria-label={t('userInfo.preference.back')}
            className="bg-surface-muted text-ink-muted focus-visible:ring-brand -ml-1 flex size-8 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none active:brightness-95"
          >
            <ChevronLeftIcon className="size-4" strokeWidth={2.4} />
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
                selected={isRecalled(choice)}
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
