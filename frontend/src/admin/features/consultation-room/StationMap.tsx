import {
  toPointOnFloor,
  type UserRouteStep,
} from '@/admin/features/consultation-room/useUserRoute'
import { STATION_MAP_FLOORS } from '@/admin/features/consultation-room/stationMapData'

export interface StationMapProps {
  /** 도면을 그릴 층 */
  floor: string
  /** 보이는 영역. (cx-half, cy-half) 부터 half*2 만큼 */
  cx: number
  cy: number
  half: number
  route: readonly UserRouteStep[]
}

/** 마커 원 반지름 (도면 좌표 기준) */
const MARKER_RADIUS = 21

/**
 * 역 내 도면 + 경로 단계 번호.
 *
 * 도면 위의 표지판 점(.sign)은 모두 숨기고 경로 단계 번호만 남긴다.
 * 점선은 같은 층에 있는 구간만 잇는다.
 *
 * 도면 조각은 빌드 시점에 고정된 정적 문자열이라 dangerouslySetInnerHTML 로 넣는다.
 * 외부 입력이 섞이지 않으므로 주입 위험이 없다.
 */
export function StationMap({ floor, cx, cy, half, route }: StationMapProps) {
  const floorSvg = STATION_MAP_FLOORS[floor] ?? ''
  const viewBox = `${String(cx - half)} ${String(cy - half)} ${String(half * 2)} ${String(half * 2)}`

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label="역 내 도면과 안내 경로"
      className="bg-surface-muted block h-full w-full [&_.sign]:hidden"
    >
      <style>{`
        .wall { fill: none; stroke: #3c4d57; stroke-linejoin: round; stroke-linecap: round; }
        .area { fill: #64b5f6; fill-opacity: .3; stroke: #3f8fd6; stroke-width: 1.5; stroke-opacity: .6; }
        .area-label { fill: #1c4a72; text-anchor: middle; dominant-baseline: middle; font-weight: 700;
          paint-order: stroke; stroke: #eef1f4; stroke-width: 3px; stroke-linejoin: round; }
        .label-text { fill: #2a3541; font-weight: 600; dominant-baseline: middle; }
        .facility-bg { stroke: rgba(255,255,255,.55); stroke-width: 1.6; }
        .facility-icon { stroke: #fff; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .facility-icon .fac-fill { fill: #fff; stroke: none; }
        .rtleg { fill: none; stroke: #94A3B8; stroke-linecap: round; stroke-dasharray: 3 7; opacity: .9; }
        .rtdisc { fill: #018ABE; stroke: #fff; stroke-width: 2.2; }
        .rtnum { fill: #fff; text-anchor: middle; dominant-baseline: central; font-weight: 800; font-size: 14px; }
      `}</style>

      <g dangerouslySetInnerHTML={{ __html: floorSvg }} />

      <g>
        {route.slice(0, -1).map((step, index) => {
          const from = toPointOnFloor(step, floor)
          const to = toPointOnFloor(route[index + 1], floor)
          if (!from || !to) return null

          return (
            <line
              key={`${step.id}-leg`}
              className="rtleg"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={4}
            />
          )
        })}
      </g>

      <g>
        {route.map((step, index) => {
          const point = toPointOnFloor(step, floor)
          if (!point) return null

          return (
            <g
              key={step.id}
              transform={`translate(${String(point.x)} ${String(point.y)})`}
            >
              <circle className="rtdisc" r={MARKER_RADIUS} />
              <text className="rtnum">{index + 1}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
