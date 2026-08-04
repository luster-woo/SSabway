import {
  DAEGU_EDGES,
  DAEGU_NODES,
  type DaeguMapPoint,
} from '@/shared/station-map/daeguNavigation'

/**
 * 지도에 선을 긋는 데 필요한 최소 단계 정보.
 * (GuideStep 이 이 형태를 만족한다 — edgeId·from·to 는 BE 응답 원본이다)
 */
export interface RouteStepRef {
  edgeId: string
  /** 출발 노드 id — 이 단계에서의 현재 위치 */
  from: string
  /** 도착 노드 id — 이 단계에서의 다음 위치 */
  to: string
}

/**
 * 한 단계의 경로선 좌표를 진행 방향으로 만든다.
 *
 * 엣지의 geometry 는 "첫 점 = edge.from, 끝 점 = edge.to" 고정이다
 * (docs/map/README.md). 그런데 엣지는 양방향이라, 단계가 엣지를 거꾸로
 * 지날 수 있다(step.from === edge.to). 그때는 뒤집어서 화면의 선이 항상
 * 현재 위치 → 다음 위치 방향이 되게 한다.
 *
 * 응답의 edgeId 가 도면 데이터에 없으면(데이터가 서로 낡은 경우) 노드
 * 좌표를 잇는 직선으로 대체한다 — 선이 벽을 뚫더라도 경로가 통째로
 * 끊기는 것보다 낫다. 노드마저 모르면 null 이고, 그 단계는 그리지 않는다.
 */
export function toStepPath(step: RouteStepRef): DaeguMapPoint[] | null {
  const edge = DAEGU_EDGES[step.edgeId]

  if (edge && edge.geometry.length >= 2) {
    if (edge.from === step.from) return edge.geometry
    if (edge.to === step.from) return [...edge.geometry].reverse()
  }

  const from = DAEGU_NODES[step.from]
  const to = DAEGU_NODES[step.to]
  if (from && to) {
    return [
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
    ]
  }

  return null
}

/**
 * 경로·마커 색. 지도(StationRouteMap)와 범례(StationMapOverlay)가 같은 값을
 * 봐야 해서 컴포넌트 밖에 둔다. (컴포넌트 파일에서 상수를 export 하면
 * fast refresh 가 전체 리로드로 떨어진다)
 */
export const ROUTE_COLOR = {
  /** 지나온 구간 */
  passed: '#94A3B8',
  /** 현재 위치·현재 구간 */
  current: '#D9435F',
  /** 앞으로 갈 구간·다음 위치 */
  upcoming: '#018ABE',
} as const

export interface RouteBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** 좌표들이 모두 들어가는 최소 사각형. 비어 있으면 null. */
export function toRouteBounds(
  paths: readonly (readonly DaeguMapPoint[] | null)[],
): RouteBounds | null {
  let bounds: RouteBounds | null = null

  for (const path of paths) {
    if (!path) continue
    for (const point of path) {
      if (!bounds) {
        bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y }
        continue
      }
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }
  }

  return bounds
}
