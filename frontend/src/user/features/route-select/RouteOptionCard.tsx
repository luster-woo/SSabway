import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { toDurationLabel } from '@/shared/lib/routeDuration'
import type { RoutePath } from '@/shared/types/route'
import { Button, Card } from '@/shared/ui'
import { RouteTimeline } from '@/user/features/route-select/RouteTimeline'
import {
  ROUTE_BADGE,
  toLaneSummary,
  toStationSequence,
  type RouteBadge,
} from '@/user/features/route-select/lib/routeBadge'

const BADGE_STYLE: Record<RouteBadge, string> = {
  [ROUTE_BADGE.FASTEST]: 'bg-brand text-white',
  [ROUTE_BADGE.NO_TRANSFER]: 'bg-brand-soft text-brand-dark',
  [ROUTE_BADGE.CHEAPEST]: 'bg-surface-muted text-ink-muted',
}

const BADGE_LABEL_KEY: Record<RouteBadge, string> = {
  [ROUTE_BADGE.FASTEST]: 'route.select.badge.fastest',
  [ROUTE_BADGE.NO_TRANSFER]: 'route.select.badge.noTransfer',
  [ROUTE_BADGE.CHEAPEST]: 'route.select.badge.cheapest',
}

export interface RouteOptionCardProps {
  path: RoutePath
  badge: RouteBadge | null
  selected: boolean
  onSelect: () => void
  onStart: () => void
}

/**
 * 추천 경로 한 건을 보여주는 카드.
 *
 * 카드 전체가 선택 대상이고(radio) 안쪽 버튼은 안내 시작이다.
 * 버튼 클릭이 카드 선택으로 번지지 않게 이벤트 전파를 끊는다.
 *
 * 서버는 소요 시간과 요금을 숫자(분·원)로만 준다. 표시 문자열("24분"·"1,550원")은
 * 언어마다 다르므로 이 컴포넌트가 i18n 으로 만든다.
 */
export function RouteOptionCard({
  path,
  badge,
  selected,
  onSelect,
  onStart,
}: RouteOptionCardProps) {
  const { t, i18n } = useTranslation()
  const stations = toStationSequence(path)

  /** 60분을 넘으면 "1시간 24분"으로 끊어 읽는다. 도착 요약과 같은 규칙이다. */
  const durationLabel = toDurationLabel(t, path.totalTime)

  /** 천 단위 구분은 로케일에 맡긴다. (1550 → "1,550" / "1 550") */
  const fareLabel = t('route.select.fare', {
    amount: path.payment.toLocaleString(i18n.language),
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect()
  }

  return (
    <Card
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'focus-visible:ring-brand cursor-pointer transition focus-visible:ring-2 focus-visible:outline-none',
        selected
          ? 'border-brand ring-brand/25 bg-brand-soft/20 ring-2'
          : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {badge ? (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11.5px] font-bold',
              BADGE_STYLE[badge],
            )}
          >
            {t(BADGE_LABEL_KEY[badge])}
          </span>
        ) : (
          <span />
        )}

        <span className="text-ink-muted shrink-0 text-[13px] font-semibold">
          {fareLabel}
        </span>
      </div>

      <p className="text-ink mt-2 text-[clamp(28px,8.5vw,34px)] leading-tight font-extrabold">
        {durationLabel}
      </p>

      <p className="text-ink-muted mt-1 text-[12.5px]">
        {toLaneSummary(path)}
        {' / '}
        {path.transferCount === 0
          ? t('route.select.noTransfer')
          : /* count 키는 i18next 복수형 규칙을 타므로 n으로 넘긴다 */
            t('route.select.transferCount', { n: path.transferCount })}
      </p>

      <RouteTimeline
        stations={stations}
        lanes={path.segments.map((segment) => segment.lane)}
        active={selected}
        className="mt-4"
      />

      <Button
        size="lg"
        fullWidth
        variant={selected ? 'primary' : 'secondary'}
        className="mt-4"
        onClick={(event) => {
          event.stopPropagation()
          onStart()
        }}
      >
        {t('route.select.start')}
      </Button>
    </Card>
  )
}
