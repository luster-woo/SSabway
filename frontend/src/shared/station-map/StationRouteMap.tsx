import { useMemo } from 'react'

import { DAEGU_MAP_SVG } from '@/shared/station-map/daeguMap'
import { DAEGU_NODES } from '@/shared/station-map/daeguNavigation'
import {
  ROUTE_COLOR,
  toStepPath,
  type RouteStepRef,
} from '@/shared/station-map/routePath'

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

/** 현재·다음 위치 마커 반지름 (도면 좌표 기준, markerScale=1 일 때) */
const MARKER_RADIUS = 26

/** 현재 위치 펄스 링의 최대 반지름 */
const CURRENT_RING_RADIUS = 44

/** 경로선 굵기 */
const ROUTE_WIDTH = 12

/** 현재 구간(현재 위치 → 다음 위치) 강조선 굵기 */
const CURRENT_WIDTH = 18

/**
 * 대구역 실내 지도 + 서버 경로.
 *
 * 배경은 daegu_map.svg 한 장이다 — 원본이 모든 층을 한 화면에 그린 지도라
 * 층 전환 없이 그대로 쓴다(팀 결정). 그 위에 응답 steps 의 엣지 좌표로
 * 전체 경로를 긋고, 현재 단계의 구간과 양 끝(현재 위치·다음 위치)을 강조한다.
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
        .rt-pos { stroke: #fff; stroke-width: ${String(4 * markerScale)}; }
        .rt-ring { fill: none; stroke: ${ROUTE_COLOR.current}; stroke-width: ${String(5 * markerScale)}; opacity: .85; }
        @keyframes rtpulse {
          0% { r: ${String((MARKER_RADIUS + 5) * markerScale)}; opacity: .85; }
          70% { r: ${String(CURRENT_RING_RADIUS * markerScale)}; opacity: 0; }
          100% { opacity: 0; }
        }
        .rt-ring { animation: rtpulse 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .rt-ring { animation: none; r: ${String((CURRENT_RING_RADIUS - 8) * markerScale)}; }
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

        {/* 현재 구간(현재 위치 → 다음 위치)은 맨 위에 굵게 */}
        {currentPath ? (
          <polyline
            points={toPoints(currentPath)}
            stroke={ROUTE_COLOR.current}
            strokeWidth={CURRENT_WIDTH * markerScale}
          />
        ) : null}
      </g>

      {/* 다음 위치 */}
      {nextPoint ? (
        <circle
          className="rt-pos"
          cx={nextPoint.x}
          cy={nextPoint.y}
          r={MARKER_RADIUS * markerScale}
          fill={ROUTE_COLOR.upcoming}
        />
      ) : null}

      {/* 현재 위치 — 펄스 링으로 가장 눈에 띄게 */}
      {currentPoint ? (
        <g>
          <circle className="rt-ring" cx={currentPoint.x} cy={currentPoint.y} />
          <circle
            className="rt-pos"
            cx={currentPoint.x}
            cy={currentPoint.y}
            r={MARKER_RADIUS * markerScale}
            fill={ROUTE_COLOR.current}
          />
        </g>
      ) : null}
    </svg>
  )
}
