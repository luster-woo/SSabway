import { cn } from '@/shared/lib/cn'
import { SUBWAY_LANE, type SubwayLane } from '@/shared/types/route'
import { laneColor } from '@/user/features/route-select/lib/laneColor'

export interface RouteTimelineProps {
  /** 출발역 → 환승역… → 도착역 */
  stations: string[]
  /**
   * 각 구간(역과 역 사이)의 노선. 선·점을 노선 색으로 칠한다.
   * `stations.length - 1` 개이며, 비면 노선 색 없이 회색/브랜드색으로 그린다.
   */
  lanes?: SubwayLane[]
  /** 선택된 카드는 선·점을 진하게 그린다. (노선 색이 없을 때만 적용) */
  active?: boolean
  className?: string
}

/**
 * 경로 카드의 역 흐름 표시. 선 위에 역 수만큼 점을 찍고 아래에 이름을 단다.
 *
 * 점 위치는 역 개수에 따라 달라져 Tailwind 클래스로 표현할 수 없으므로
 * 퍼센트 인라인 스타일을 쓴다.
 *
 * 노선(lanes)이 주어지면 구간마다 그 노선 색으로 선을 나눠 칠하고, 점 테두리도
 * 맞닿은 구간의 색을 쓴다. 환승이 있으면 색이 바뀌는 지점이 곧 환승역이다.
 */
export function RouteTimeline({
  stations,
  lanes = [],
  active = false,
  className,
}: RouteTimelineProps) {
  const lastIndex = stations.length - 1
  const hasLanes = lanes.length > 0

  /** 역 index 의 가로 위치(%). 역이 하나뿐이면 가운데. */
  const posOf = (index: number) =>
    lastIndex === 0 ? 50 : (index / lastIndex) * 100

  /** 구간(또는 점)의 노선 색. 범위를 벗어나면 마지막 구간 색으로 맞춘다. */
  const colorOf = (segmentIndex: number) =>
    laneColor(lanes[Math.min(segmentIndex, lanes.length - 1)] ?? SUBWAY_LANE.UNKNOWN)

  return (
    <div className={cn('select-none', className)} aria-hidden>
      <div className="relative h-3">
        {hasLanes ? (
          // 구간별로 선을 나눠 노선 색으로 칠한다.
          stations.slice(0, -1).map((station, index) => (
            <span
              key={`seg-${station}-${index}`}
              className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
              style={{
                left: `${String(posOf(index))}%`,
                right: `${String(100 - posOf(index + 1))}%`,
                backgroundColor: colorOf(index),
              }}
            />
          ))
        ) : (
          <span
            className={cn(
              'absolute inset-x-1.5 top-1/2 h-[3px] -translate-y-1/2 rounded-full',
              active ? 'bg-brand' : 'bg-line',
            )}
          />
        )}

        {stations.map((station, index) => (
          <span
            key={`${station}-${index}`}
            style={{
              left: `${String(posOf(index))}%`,
              ...(hasLanes ? { borderColor: colorOf(index) } : {}),
            }}
            className={cn(
              'bg-surface absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]',
              !hasLanes && (active ? 'border-brand' : 'border-line'),
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
