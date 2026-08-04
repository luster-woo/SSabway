import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import {
  ORIGIN_SOURCE,
  useOriginStationStore,
} from '@/shared/lib/store/useOriginStationStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import type { GuideInfo } from '@/shared/types/guide'

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
 * 보조 설명(detail)은 두 지점에서 뜻이 다르다.
 *   출발 — 좌표를 무엇으로 잡았는지(GPS 추정 / 지도에서 직접 선택)
 *   도착 — 사용자가 고른 최종 목적지. 도착역과 이름이 같으면(역 자체를 목적지로
 *          골랐을 때) 중복이라 "지도에서 선택"으로 대체한다.
 */
export function useGuideInfo(): UseGuideInfoResult {
  const { t } = useTranslation()

  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)
  const originSource = useOriginStationStore((state) => state.originSource)
  const destination = useDestinationStore((state) => state.destination)

  const info = useMemo<GuideInfo | null>(() => {
    if (!selectedRoute) return null

    const originDetail =
      originSource === ORIGIN_SOURCE.MANUAL
        ? t('userInfo.detail.manual')
        : t('userInfo.detail.gps')

    const finalName = destination?.name ?? null
    const destinationDetail =
      finalName && finalName !== selectedRoute.arrivalStation
        ? t('userInfo.detail.finalDestination', { name: finalName })
        : t('userInfo.detail.manual')

    return {
      origin: { name: selectedRoute.departureStation, detail: originDetail },
      destination: {
        name: selectedRoute.arrivalStation,
        detail: destinationDetail,
      },
    }
  }, [selectedRoute, originSource, destination, t])

  return { info, isRouteMissing: info === null }
}
