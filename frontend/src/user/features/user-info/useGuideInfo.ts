import { useMemo } from 'react'

import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import {
  resolveStationNodes,
  useStationNodeStore,
} from '@/shared/lib/store/useStationNodeStore'
import type { GuideInfo } from '@/shared/types/guide'
import { SUBWAY_LANE_LABEL } from '@/shared/types/route'

export interface UseGuideInfoResult {
  /** 표시할 안내 정보. 경로를 아직 고르지 않았으면 null */
  info: GuideInfo | null
  /** 경로 선택을 거치지 않아 보여줄 것이 없다 */
  isRouteMissing: boolean
}

/**
 * 안내 정보(출발·도착)를 만든다.
 *
 * 서버 조회가 아니라 **스토어 파생**이다. 출발역·도착역은 사용자가 경로 선택
 * 화면에서 고른 경로가 정한다(`useSelectedRouteStore`) — 이 화면이 확인시켜야
 * 하는 것이 바로 "그 경로로 가겠는가"이므로, 다른 출처의 값을 보여주면 사용자가
 * 방금 고른 것과 어긋난다.
 *
 * 두 값 모두 **같은 역 안**의 지점이다 — 역 단위로 끊어 안내하는 방향이라,
 * 이 화면이 확인시키는 것은 "지금 이 역 안에서 어디부터 어디까지 가는가"다.
 *   출발 — 표지판으로 인식한 노드
 *   도착 — 그 역에서 향할 노드(탄 노선의 개찰구)
 *
 * 노드는 인식 결과가 없으면 파일럿 기본값으로 메운다(resolveStationNodes) —
 * 실제 안내 요청(/routes/navi)이 쓰는 값과 같아야 화면과 안내가 어긋나지 않는다.
 *
 * 노드 코드는 원문 그대로 보여준다. 사람이 읽을 이름으로 옮기는 매핑은 나중에
 * 붙일 예정이라, 지금은 그 자리에 코드가 그대로 들어간다.
 */
/** 층 값에 F 를 붙인다. 이미 F 로 끝나면 그대로 둔다. 값이 없으면 null. */
function formatFloor(floor: string | null): string | null {
  const trimmed = floor?.trim()
  if (!trimmed) return null
  return /f$/i.test(trimmed) ? trimmed.toUpperCase() : `${trimmed}F`
}

export function useGuideInfo(): UseGuideInfoResult {
  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)
  const startPoint = useStationNodeStore((state) => state.startPoint)
  const startFloor = useStationNodeStore((state) => state.startFloor)
  const finalPoint = useStationNodeStore((state) => state.finalPoint)

  const info = useMemo<GuideInfo | null>(() => {
    if (!selectedRoute) return null

    const nodes = resolveStationNodes({ startPoint, finalPoint })
    const station = selectedRoute.departureStation

    /*
      출발 — "역 이름 {층}F {노드 코드}". 예: "대구역 3F S3_16".
      층은 표지판 인식이 준 값이다. 없으면 층 없이 노드 코드만 붙인다.
      노드 코드를 사람이 읽는 이름("대합실앞")으로 옮기는 매핑은 나중에 붙는다.
    */
    const floorLabel = formatFloor(startFloor)
    const origin = floorLabel
      ? `${station} ${floorLabel} ${nodes.startPoint}`
      : `${station} ${nodes.startPoint}`

    /*
      도착 — "역 이름 {n}호선 개찰구". 예: "대구역 1호선 개찰구".
      노선은 사용자가 고른 경로의 첫 구간(오디세이)에서 온다. 노선을 못 얻으면
      (구버전 응답·비지원 조합) 예전처럼 노드 코드로 폴백한다.
    */
    const laneLabel = selectedRoute.boardingLane
      ? SUBWAY_LANE_LABEL[selectedRoute.boardingLane]
      : null
    const destination = laneLabel
      ? `${station} ${laneLabel} 개찰구`
      : `${station} ${nodes.finalPoint}`

    return { origin, destination }
  }, [selectedRoute, startPoint, startFloor, finalPoint])

  return { info, isRouteMissing: info === null }
}
