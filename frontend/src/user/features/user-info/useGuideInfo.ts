import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import {
  resolveStationNodes,
  useStationNodeStore,
} from '@/shared/lib/store/useStationNodeStore'
import { describeStationPoint } from '@/shared/station-map/pointLandmark'
import type { GuideInfo } from '@/shared/types/guide'
import { SUBWAY_LANE, type SubwayLane } from '@/shared/types/route'

/** 노선 → 로케일 키. 목적지("{역} {노선} 개찰구")의 노선 표기를 언어에 맞춘다. */
const LANE_LABEL_KEY: Record<SubwayLane, string | null> = {
  [SUBWAY_LANE.DAEGU_LINE_1]: 'route.lane.line1',
  [SUBWAY_LANE.DAEGU_LINE_2]: 'route.lane.line2',
  [SUBWAY_LANE.DAEGU_LINE_3]: 'route.lane.line3',
  [SUBWAY_LANE.DAEGYEONG_LINE]: 'route.lane.daegyeong',
  [SUBWAY_LANE.UNKNOWN]: null,
}

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
 * 출발 노드 코드(`S3_16`)는 그대로 보여주면 사용자가 읽을 수 없어서, 지도 데이터로
 * 만든 표기("대구역 3층 6번 출구 앞")로 옮긴다 — describeStationPoint 참고. 층은
 * 그 매핑이 노드에서 뽑으므로(표지판이 선 층), 여기서 startFloor 를 따로 붙이지
 * 않는다. 매핑에 없는 코드는 예전처럼 "역 이름 + 코드" 가 그대로 남는다.
 */
export function useGuideInfo(): UseGuideInfoResult {
  const { t } = useTranslation()
  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)
  const startPoint = useStationNodeStore((state) => state.startPoint)
  const finalPoint = useStationNodeStore((state) => state.finalPoint)

  const info = useMemo<GuideInfo | null>(() => {
    if (!selectedRoute) return null

    const nodes = resolveStationNodes({ startPoint, finalPoint })
    const stationLabel = selectedRoute.departureStation
    const stationKor = selectedRoute.departureStationKor

    /*
      출발 — 표지판으로 인식한 노드를 사람이 읽는 위치로 옮긴다.
      예: "대구역 3층 6번 출구 앞". 문구·층·시설 종류는 전부 describeStationPoint
      (매핑 + 로케일)가 만든다. 사용자가 처음 고른 언어로 나온다.
    */
    const origin = describeStationPoint({
      nodeId: nodes.startPoint,
      stationLabel,
      stationKor,
      t,
    })

    /*
      도착 — "역 이름 {n}호선 개찰구". 예: "대구역 1호선 개찰구".
      노선은 사용자가 고른 경로의 첫 구간(오디세이)에서 온다. 노선을 못 얻으면
      (구버전 응답·비지원 조합) 개찰구 노드를 describeStationPoint 로 옮겨 폴백한다.
    */
    const laneKey = selectedRoute.boardingLane
      ? LANE_LABEL_KEY[selectedRoute.boardingLane]
      : null
    const destination = laneKey
      ? t('userInfo.gateDestination', {
          station: stationLabel,
          lane: t(laneKey),
        })
      : describeStationPoint({
          nodeId: nodes.finalPoint,
          stationLabel,
          stationKor,
          t,
        })

    return { origin, destination }
  }, [selectedRoute, startPoint, finalPoint, t])

  return { info, isRouteMissing: info === null }
}
