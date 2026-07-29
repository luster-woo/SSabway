import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/user/features/route-guide/icons'

export interface StepNavigatorProps {
  /** 0부터 시작하는 현재 단계 */
  activeIndex: number
  count: number
  onPrev: () => void
  onNext: () => void
}

/**
 * 단계 넘기기 — [이전] · 진행 점 · [다음]
 *
 * 첫 단계에서는 [이전]을, 마지막 단계에서는 [다음]을 잠근다.
 * 마지막 단계의 이동은 별도의 '도착 완료' 버튼이 맡는다.
 */
export function StepNavigator({
  activeIndex,
  count,
  onPrev,
  onNext,
}: StepNavigatorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="secondary"
        disabled={activeIndex === 0}
        onClick={onPrev}
        className="w-[clamp(92px,28vw,106px)] text-[13.5px]"
      >
        <ChevronLeftIcon className="size-4" />
        {t('routeGuide.prev')}
      </Button>

      {/* 진행 상황은 헤더의 진행률 바가 읽어주므로 점은 시각 표시만 한다. */}
      <div aria-hidden className="flex items-center justify-center gap-2">
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-2 rounded-full transition-colors',
              index === activeIndex ? 'bg-brand' : 'bg-line',
            )}
          />
        ))}
      </div>

      <Button
        disabled={activeIndex === count - 1}
        onClick={onNext}
        className="w-[clamp(92px,28vw,106px)] text-[13.5px]"
      >
        {t('routeGuide.next')}
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  )
}
