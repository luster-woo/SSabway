import { cn } from '@/shared/lib/cn'

export interface RouteTimelineProps {
  /** 출발역 → 환승역… → 도착역 */
  stations: string[]
  /** 선택된 카드는 선·점을 진하게 그린다. */
  active?: boolean
  className?: string
}

/**
 * 경로 카드의 역 흐름 표시. 선 위에 역 수만큼 점을 찍고 아래에 이름을 단다.
 *
 * 점 위치는 역 개수에 따라 달라져 Tailwind 클래스로 표현할 수 없으므로
 * 퍼센트 인라인 스타일을 쓴다.
 */
export function RouteTimeline({
  stations,
  active = false,
  className,
}: RouteTimelineProps) {
  const lastIndex = stations.length - 1

  return (
    <div className={cn('select-none', className)} aria-hidden>
      <div className="relative h-3">
        <span
          className={cn(
            'absolute inset-x-1.5 top-1/2 h-[3px] -translate-y-1/2 rounded-full',
            active ? 'bg-brand' : 'bg-line',
          )}
        />
        {stations.map((station, index) => (
          <span
            key={`${station}-${index}`}
            style={{
              left: lastIndex === 0 ? '50%' : `${(index / lastIndex) * 100}%`,
            }}
            className={cn(
              'bg-surface absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]',
              active ? 'border-brand' : 'border-line',
            )}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between gap-2">
        {stations.map((station, index) => (
          <span
            key={`${station}-label-${index}`}
            className={cn(
              'text-ink-muted min-w-0 truncate text-[11px]',
              index === 0 && 'text-left',
              index === lastIndex && lastIndex !== 0 && 'text-right',
            )}
          >
            {station}
          </span>
        ))}
      </div>
    </div>
  )
}
