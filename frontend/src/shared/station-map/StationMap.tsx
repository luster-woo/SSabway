import {
  toPointOnFloor,
  type UserRouteStep,
} from '@/shared/station-map/stationRoute'
import { STATION_MAP_FLOORS } from '@/shared/station-map/stationMapData'

export interface StationMapProps {
  /** 도면을 그릴 층 */
  floor: string
  /** 보이는 영역. (cx-half, cy-half) 부터 half*2 만큼 */
  cx: number
  cy: number
  half: number
  route: readonly UserRouteStep[]
  /**
   * 사용자의 현재 단계 인덱스 (0부터).
   *
   * 값을 주면 마커가 진행 상태별로 칠해진다 — 지나온 단계는 회색,
   * 현재 단계는 붉은 링, 남은 단계는 파랑. 사용자 앱의 "현재 위치 보기"용.
   * 생략하면 전부 파랑 — 관리자 화면의 기존 모습 그대로다.
   */
  currentIndex?: number
  /**
   * 마커·점선의 크기 배율 (기본 1).
   *
   * 마커 반지름은 도면 좌표 기준이라 확대할수록 화면에서 커진다.
   * 확대 UI(사용자 오버레이)는 뷰포트 반경에 비례한 값을 넘겨
   * 화면상 크기를 일정하게 유지한다. (viewport.half / view.half)
   */
  markerScale?: number
}

/** 마커 원 반지름 (도면 좌표 기준) */
const MARKER_RADIUS = 21

/** 현재 위치 마커를 감싸는 링 반지름 */
const CURRENT_RING_RADIUS = 34

/** 마커 진행 상태별 채움색. 범례(StationMapOverlay)와 같은 값을 써야 한다. */
export const MARKER_COLOR = {
  passed: '#94A3B8',
  current: '#D9435F',
  upcoming: '#018ABE',
} as const

function toMarkerColor(index: number, currentIndex?: number): string {
  if (currentIndex === undefined) return MARKER_COLOR.upcoming
  if (index < currentIndex) return MARKER_COLOR.passed
  if (index === currentIndex) return MARKER_COLOR.current
  return MARKER_COLOR.upcoming
}

/**
 * 역 내 도면 + 경로 단계 번호. (사용자·관리자 공용 — 8/3 shared 승격)
 *
 * 도면 위의 표지판 점(.sign)은 모두 숨기고 경로 단계 번호만 남긴다.
 * 점선은 같은 층에 있는 구간만 잇는다.
 *
 * 도면 조각은 빌드 시점에 고정된 정적 문자열이라 dangerouslySetInnerHTML 로 넣는다.
 * 외부 입력이 섞이지 않으므로 주입 위험이 없다.
 */
export function StationMap({
  floor,
  cx,
  cy,
  half,
  route,
  currentIndex,
  markerScale = 1,
}: StationMapProps) {
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
        .rtdisc { stroke: #fff; stroke-width: 2.2; }
        .rtnum { fill: #fff; text-anchor: middle; dominant-baseline: central; font-weight: 800; font-size: 14px; }
        .rtring { fill: none; stroke: ${MARKER_COLOR.current}; stroke-width: 4; opacity: .85; }
        @keyframes rtpulse { 0% { r: ${String(MARKER_RADIUS + 4)}; opacity: .85; } 70% { r: ${String(CURRENT_RING_RADIUS)}; opacity: 0; } 100% { opacity: 0; } }
        .rtring { animation: rtpulse 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rtring { animation: none; r: ${String(CURRENT_RING_RADIUS - 6)}; } }
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
              strokeWidth={4 * markerScale}
            />
          )
        })}
      </g>

      <g>
        {route.map((step, index) => {
          const point = toPointOnFloor(step, floor)
          if (!point) return null

          const isCurrent = currentIndex !== undefined && index === currentIndex

          return (
            <g
              key={step.id}
              // scale 은 마커 내부(원·번호·링)에만 적용된다 — 좌표는 그대로.
              transform={`translate(${String(point.x)} ${String(point.y)}) scale(${String(markerScale)})`}
            >
              {isCurrent ? <circle className="rtring" /> : null}
              <circle
                className="rtdisc"
                r={MARKER_RADIUS}
                fill={toMarkerColor(index, currentIndex)}
              />
              <text className="rtnum">{index + 1}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
