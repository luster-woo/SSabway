import { useMemo } from 'react'

import { DAEGU_MAP_SVG } from '@/shared/station-map/daeguMap'
import { DAEGU_NODES } from '@/shared/station-map/daeguNavigation'
import {
  DIRECTION_ARROW_PATH,
  DIRECTION_ARROW_WIDTH,
  DIRECTION_FLOW_DURATION,
  DIRECTION_SPACING,
  MY_LOCATION_BORDER,
  MY_LOCATION_COLOR,
  MY_LOCATION_HALO_RADIUS,
  MY_LOCATION_PULSE_RADIUS,
  MY_LOCATION_RADIUS,
  toDirectionFlowDelay,
  toDirectionMarks,
  type DirectionMark,
} from '@/shared/station-map/mapMarkers'
import {
  ROUTE_COLOR,
  toStepPath,
  type RouteStepRef,
} from '@/shared/station-map/routePath'

/** 다음 위치 마커 반지름 (도면 좌표 기준, markerScale=1 일 때) */
const NEXT_RADIUS = 26

/** 다음 위치 마커의 고리 굵기 — 꽉 찬 내 위치 점과 구별되는 모양이다 */
const NEXT_BORDER = 11

/** 경로선 굵기. 화살촉(벌어짐 10 × 2)이 선 안에 들어오는 값이다. */
const ROUTE_WIDTH = 28

/** 현재 구간(내 위치 → 다음 위치) 강조선 굵기 */
const CURRENT_WIDTH = 38

/** 마커에 화살촉이 겹치지 않도록 구간 양 끝에서 비워 둘 길이 */
const CURRENT_START_GAP = MY_LOCATION_HALO_RADIUS
const CURRENT_END_GAP = NEXT_RADIUS * 1.8
const UPCOMING_GAP = 30

/** 화살촉 하나 — 위치·방향과 흐르는 애니메이션의 순번을 함께 갖는다. */
interface FlowArrow extends DirectionMark {
  order: number
}

export interface StationRouteMapProps {
  /** 보이는 영역(정사각형). (cx-half, cy-half) 부터 half*2 만큼 */
  cx: number
  cy: number
  half: number
  /** 서버가 내려준 경로 단계들. edgeId·from·to 로 도면의 선을 찾는다. */
  steps: readonly RouteStepRef[]
  /** 현재 단계 인덱스 (0부터). 이 단계의 from 이 현재 위치, to 가 다음 위치다. */
  currentIndex: number
  /**
   * 마커·선 굵기 배율 (기본 1).
   *
   * 좌표 단위 크기라 확대할수록 화면에서 커진다. 확대 UI 는 뷰포트 반경에
   * 비례한 값을 넘겨 화면상 크기를 일정하게 유지한다.
   */
  markerScale?: number
}

/**
 * 대구역 실내 지도 + 서버 경로.
 *
 * 배경은 daegu_map.svg 한 장이다 — 원본이 모든 층을 한 화면에 그린 지도라
 * 층 전환 없이 그대로 쓴다(팀 결정). 그 위에 응답 steps 의 엣지 좌표로
 * 전체 경로를 긋고, 현재 단계의 구간과 양 끝(내 위치·다음 위치)을 강조한다.
 *
 * 표시 규칙
 * - 내 위치: 흰 테두리 파란 점 + 옅은 반경 원 + 펄스 링. 경로선(빨강·파랑)과
 *   색이 겹치지 않아 "지금 내가 있는 곳"이 한눈에 구분된다. 기기 방위
 *   (compass)는 쓰지 않는다 — 위치의 근거가 GPS·자기센서가 아니라 "마지막으로
 *   인식한 표지판"이라 도면 기준 방위를 신뢰할 수 없기 때문이다.
 * - 가야 하는 길: 남은 구간 위에 진행 방향 화살촉을 일정 간격으로 얹고,
 *   진행 방향 순서로 밝아지게 해서 어느 쪽으로 가는지 보이게 한다.
 *
 * 도면 마크업은 빌드 시점에 고정된 정적 문자열이라 dangerouslySetInnerHTML 로
 * 넣는다. 외부 입력이 섞이지 않으므로 주입 위험이 없다.
 */
export function StationRouteMap({
  cx,
  cy,
  half,
  steps,
  currentIndex,
  markerScale = 1,
}: StationRouteMapProps) {
  const viewBox = `${String(cx - half)} ${String(cy - half)} ${String(half * 2)} ${String(half * 2)}`

  // 단계별 경로선. 인덱스가 steps 와 나란해야 진행 상태를 칠할 수 있다.
  const stepPaths = useMemo(() => steps.map(toStepPath), [steps])

  const currentStep = steps[currentIndex] as RouteStepRef | undefined
  const currentPath = stepPaths[currentIndex] ?? null

  // 현재·다음 위치. 노드를 모르면 현재 구간 선의 양 끝점으로 대체한다.
  const currentPoint =
    (currentStep ? DAEGU_NODES[currentStep.from] : undefined) ??
    currentPath?.[0] ??
    null
  const nextPoint =
    (currentStep ? DAEGU_NODES[currentStep.to] : undefined) ??
    currentPath?.[currentPath.length - 1] ??
    null

  /*
    남은 경로(현재 구간부터 끝까지)의 화살촉.

    order 를 구간 경계와 무관하게 이어서 매기므로 단계가 바뀌는 지점에서도
    밝아지는 흐름이 끊기지 않는다. 지나온 구간에는 화살촉을 두지 않는다 —
    이미 지난 길의 방향은 알려 줄 필요가 없다.
  */
  const flowArrows = useMemo<FlowArrow[]>(() => {
    const arrows: FlowArrow[] = []

    for (
      let index = Math.max(currentIndex, 0);
      index < stepPaths.length;
      index += 1
    ) {
      const path = stepPaths[index]
      if (!path) continue

      const isCurrent = index === currentIndex
      const marks = toDirectionMarks(
        path,
        DIRECTION_SPACING * markerScale,
        (isCurrent ? CURRENT_START_GAP : UPCOMING_GAP) * markerScale,
        (isCurrent ? CURRENT_END_GAP : UPCOMING_GAP) * markerScale,
      )

      for (const mark of marks) {
        arrows.push({ ...mark, order: arrows.length })
      }
    }

    return arrows
  }, [stepPaths, currentIndex, markerScale])

  const toPoints = (path: readonly { x: number; y: number }[]) =>
    path.map((point) => `${String(point.x)},${String(point.y)}`).join(' ')

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label="역 내 도면과 안내 경로"
      className="bg-surface-muted block h-full w-full"
    >
      <style>{`
        .rt-halo { fill: ${MY_LOCATION_COLOR}; fill-opacity: .13; stroke: ${MY_LOCATION_COLOR}; stroke-opacity: .3; stroke-width: 4; }
        .rt-pulse { fill: none; stroke: ${MY_LOCATION_COLOR}; stroke-width: 9; }
        .rt-dot { fill: ${MY_LOCATION_COLOR}; stroke: #fff; stroke-width: ${String(MY_LOCATION_BORDER)};
          filter: drop-shadow(0 3px 4px rgba(15, 23, 42, .32)); }
        .rt-next { fill: #fff; stroke: ${ROUTE_COLOR.upcoming}; stroke-width: ${String(NEXT_BORDER)}; }
        .rt-arrow { fill: none; stroke: #fff; stroke-width: ${String(DIRECTION_ARROW_WIDTH)};
          stroke-linecap: round; stroke-linejoin: round; opacity: .6; }

        @keyframes rtpulse {
          0% { r: ${String(MY_LOCATION_RADIUS + 6)}; opacity: .8; }
          70% { r: ${String(MY_LOCATION_PULSE_RADIUS)}; opacity: 0; }
          100% { opacity: 0; }
        }
        .rt-pulse { animation: rtpulse 1.6s ease-out infinite; }

        /* 진행 방향 순서로 밝아져서 길이 흐르는 것처럼 보인다 */
        @keyframes rtflow {
          0% { opacity: .6; }
          22% { opacity: 1; }
          52% { opacity: .6; }
          100% { opacity: .6; }
        }
        .rt-arrow { animation: rtflow ${String(DIRECTION_FLOW_DURATION)}s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .rt-pulse { animation: none; r: ${String(MY_LOCATION_PULSE_RADIUS - 24)}; opacity: .45; }
          .rt-arrow { animation: none; opacity: .95; }
        }
      `}</style>

      <g dangerouslySetInnerHTML={{ __html: DAEGU_MAP_SVG }} />

      {/* 전체 경로 — 지나온 구간은 회색, 남은 구간은 파랑 */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {stepPaths.map((path, index) => {
          if (!path || index === currentIndex) return null
          return (
            <polyline
              // 왕복 구간은 edgeId 가 중복될 수 있어 인덱스로 구별한다.
              // 순서가 곧 정체성이라(steps 재배열 없음) 인덱스 키가 안전하다.
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              points={toPoints(path)}
              stroke={
                index < currentIndex ? ROUTE_COLOR.passed : ROUTE_COLOR.upcoming
              }
              strokeWidth={ROUTE_WIDTH * markerScale}
              opacity={index < currentIndex ? 0.75 : 0.9}
            />
          )
        })}

        {/* 현재 구간(내 위치 → 다음 위치)은 맨 위에 굵게 */}
        {currentPath ? (
          <polyline
            points={toPoints(currentPath)}
            stroke={ROUTE_COLOR.current}
            strokeWidth={CURRENT_WIDTH * markerScale}
          />
        ) : null}
      </g>

      {/* 가야 하는 방향 — 남은 경로선 위에 얹는 화살촉 */}
      <g>
        {flowArrows.map((arrow) => (
          <path
            key={arrow.order}
            className="rt-arrow"
            d={DIRECTION_ARROW_PATH}
            // scale 은 화살촉 모양에만 적용된다 — 놓을 좌표는 그대로.
            transform={`translate(${String(arrow.x)} ${String(arrow.y)}) rotate(${String(arrow.angle)}) scale(${String(markerScale)})`}
            style={{ animationDelay: toDirectionFlowDelay(arrow.order) }}
          />
        ))}
      </g>

      {/* 다음 위치 — 속이 빈 고리라 꽉 찬 내 위치 점과 헷갈리지 않는다 */}
      {nextPoint ? (
        <g
          transform={`translate(${String(nextPoint.x)} ${String(nextPoint.y)}) scale(${String(markerScale)})`}
        >
          <circle className="rt-next" r={NEXT_RADIUS} />
        </g>
      ) : null}

      {/* 내 위치 — 네이버 지도처럼 흰 테두리 파란 점 + 반경 원 + 펄스 */}
      {currentPoint ? (
        <g
          transform={`translate(${String(currentPoint.x)} ${String(currentPoint.y)}) scale(${String(markerScale)})`}
        >
          <circle className="rt-halo" r={MY_LOCATION_HALO_RADIUS} />
          <circle className="rt-pulse" />
          <circle className="rt-dot" r={MY_LOCATION_RADIUS} />
        </g>
      ) : null}
    </svg>
  )
}
