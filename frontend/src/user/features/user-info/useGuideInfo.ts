import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import {
  ORIGIN_SOURCE,
  useOriginStationStore,
} from '@/shared/lib/store/useOriginStationStore'
import { ORIGIN_SOURCE as GUIDE_ORIGIN_SOURCE } from '@/shared/types/guide'
import type { GuideInfo } from '@/shared/types/guide'
import { fetchGuideInfo } from '@/user/features/user-info/lib/fetchGuideInfo'

/**
 * 안내 정보(출발·도착)를 조회한다.
 *
 * 출발지·도착지 모두 목적지 설정 화면에서 사용자가 지도로 고른 값이 우선이다.
 * 조회 결과(목/서버)는 detail 같은 부가 라벨만 제공하고, 실제 지점은 스토어가
 * 들고 있다 — 사용자의 선택보다 서버 추정이 앞서면 안 되기 때문이다.
 *
 * 표지판을 다시 찍고 돌아오면 출발지가 바뀌어야 하므로 캐시를 오래 들고 있지 않는다.
 */
export function useGuideInfo() {
  const destination = useDestinationStore((state) => state.destination)
  const originStation = useOriginStationStore((state) => state.originStation)
  const originSource = useOriginStationStore((state) => state.originSource)

  const query = useQuery({
    queryKey: queryKeys.guide.info(),
    queryFn: fetchGuideInfo,
    staleTime: 0,
    retry: false,
  })

  const data = useMemo<GuideInfo | undefined>(() => {
    if (!query.data) return query.data

    const next: GuideInfo = { ...query.data }

    if (originStation) {
      next.origin = {
        ...query.data.origin,
        name: originStation.name,
        stationName: originStation.name,
        latitude: originStation.latitude,
        longitude: originStation.longitude,
      }
      /*
        출발지를 어떻게 잡았는지도 함께 맞춘다. 카드가 이 값으로 "표지판 인식
        결과" / "직접 선택" 문구를 고르는데, 사용자가 지도에서 골랐는데도
        인식 결과라고 표시되면 무엇을 고쳐야 할지 알 수 없다.
      */
      next.originSource =
        originSource === ORIGIN_SOURCE.MANUAL
          ? GUIDE_ORIGIN_SOURCE.MANUAL
          : GUIDE_ORIGIN_SOURCE.GPS
    }

    if (destination) {
      next.destination = {
        ...query.data.destination,
        name: destination.name,
        stationName: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      }
    }

    return next
  }, [query.data, originStation, originSource, destination])

  return { ...query, data }
}
