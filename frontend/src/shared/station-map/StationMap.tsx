import {
  toPointOnFloor,
  type UserRouteStep,
} from '@/shared/station-map/stationRoute'
import { STATION_MAP_FLOORS } from '@/shared/station-map/stationMapData'
import {
  DIRECTION_ARROW_PATH,
  DIRECTION_ARROW_WIDTH,
  DIRECTION_FLOW_DURATION,
  DIRECTION_SPACING,
  MY_LOCATION_COLOR,
  toDirectionFlowDelay,
  toDirectionMarks,
} from '@/shared/station-map/mapMarkers'

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
   * 현재 단계는 "내 위치" 마커(파란 점 + 반경 원 + 펄스), 남은 단계는 파랑.
   * 사용자 앱의 "현재 위치 보기"용.
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

/** 내 위치(현재 단계) 마커 반지름 — 번호가 들어가므로 조금 더 크다 */
const CURRENT_RADIUS = 25

/** 내 위치 마커의 흰 테두리 굵기 */
const CURRENT_BORDER = 5

/** 내 위치 마커를 감싸는 옅은 반경 원 */
const CURRENT_HALO_RADIUS = 62

/** 내 위치 펄스 링이 퍼지는 최대 반지름 */
const CURRENT_PULSE_RADIUS = 46

/** 마커 진행 상태별 채움색. 범례(StationMapOverlay)와 같은 값을 써야 한다. */
export const MARKER_COLOR = {
  passed: '#94A3B8',
  /** 현재 단계 = 내 위치. 지도 공통 색을 쓴다. */
  current: MY_LOCATION_COLOR,
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
 * 점선은 같은 층에 있는 구간만 잇고, 그 위에 진행 방향 화살촉을 얹는다 —
 * 번호만으로는 어느 쪽으로 가는 길인지 알기 어렵기 때문이다.
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

  /*
    같은 층에 이어지는 구간들과, 그 위에 놓을 진행 방향 화살촉.

    화살촉의 밝아지는 순번(order)은 층·구간을 넘어 계속 이어져야 흐름이
    끊기지 않으므로 한 번에 훑으면서 매긴다. 지나온 구간에는 놓지 않는다.
  */
  const legs = route.slice(0, -1).flatMap((step, index) => {
    const from = toPointOnFloor(step, floor)
    const to = toPointOnFloor(route[index + 1], floor)
    if (!from || !to) return []

    const isPassed = currentIndex !== undefined && index < currentIndex

    return [
      {
        id: step.id,
        from,
        to,
        color: toMarkerColor(index, currentIndex),
        arrows: isPassed
          ? []
          : toDirectionMarks(
              [from, to],
              DIRECTION_SPACING * markerScale,
              MARKER_RADIUS * 1.6 * markerScale,
            ),
      },
    ]
  })

  let arrowOrder = 0

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
        .rthalo { fill: ${MARKER_COLOR.current}; fill-opacity: .13; stroke: ${MARKER_COLOR.current}; stroke-opacity: .3; stroke-width: 2.5; }
        .rtcurrent { stroke: #fff; stroke-width: ${String(CURRENT_BORDER)}; filter: drop-shadow(0 2px 3px rgba(15,23,42,.32)); }
        .rtring { fill: none; stroke: ${MARKER_COLOR.current}; stroke-width: 4; opacity: .85; }
        @keyframes rtpulse { 0% { r: ${String(CURRENT_RADIUS + 4)}; opacity: .85; } 70% { r: ${String(CURRENT_PULSE_RADIUS)}; opacity: 0; } 100% { opacity: 0; } }
        .rtring { animation: rtpulse 1.6s ease-out infinite; }

        /* 진행 방향 화살촉 — 흰 받침 위에 색 화살촉을 얹어 점선과 섞이지 않게 한다 */
        .rtdir { fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .rtdir-base { stroke: #fff; stroke-width: ${String(DIRECTION_ARROW_WIDTH + 3.5)}; }
        .rtdir-head { stroke-width: ${String(DIRECTION_ARROW_WIDTH)}; }
        /* 진행 방향 순서로 밝아져서 길이 흐르는 것처럼 보인다 */
        @keyframes rtflow { 0% { opacity: .65; } 22% { opacity: 1; } 52% { opacity: .65; } 100% { opacity: .65; } }
        .rtdir-flow { opacity: .65; animation: rtflow ${String(DIRECTION_FLOW_DURATION)}s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .rtring { animation: none; r: ${String(CURRENT_PULSE_RADIUS - 6)}; }
          .rtdir-flow { animation: none; opacity: .95; }
        }
      `}</style>

      <g dangerouslySetInnerHTML={{ __html: floorSvg }} />

      <g>
        {legs.map((leg) => (
          <line
            key={`${leg.id}-leg`}
            className="rtleg"
            x1={leg.from.x}
            y1={leg.from.y}
            x2={leg.to.x}
            y2={leg.to.y}
            strokeWidth={4 * markerScale}
          />
        ))}
      </g>

      {/* 가야 하는 방향 */}
      <g>
        {legs.flatMap((leg) =>
          leg.arrows.map((arrow) => {
            const order = arrowOrder
            arrowOrder += 1

            return (
              <g
                key={`${leg.id}-dir-${String(order)}`}
                className="rtdir-flow"
                // scale 은 화살촉 모양에만 적용된다 — 놓을 좌표는 그대로.
                transform={`translate(${String(arrow.x)} ${String(arrow.y)}) rotate(${String(arrow.angle)}) scale(${String(markerScale)})`}
                style={{ animationDelay: toDirectionFlowDelay(order) }}
              >
                <path className="rtdir rtdir-base" d={DIRECTION_ARROW_PATH} />
                <path
                  className="rtdir rtdir-head"
                  d={DIRECTION_ARROW_PATH}
                  stroke={leg.color}
                />
              </g>
            )
          }),
        )}
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
              {isCurrent ? (
                <>
                  <circle className="rthalo" r={CURRENT_HALO_RADIUS} />
                  <circle className="rtring" />
                </>
              ) : null}
              <circle
                className={isCurrent ? 'rtcurrent' : 'rtdisc'}
                r={isCurrent ? CURRENT_RADIUS : MARKER_RADIUS}
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
