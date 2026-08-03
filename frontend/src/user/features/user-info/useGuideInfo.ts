import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import type { GuideInfo } from '@/shared/types/guide'
import { fetchGuideInfo } from '@/user/features/user-info/lib/fetchGuideInfo'

/**
 * 안내 정보(출발·도착)를 조회한다.
 *
 * 표지판을 다시 찍고 돌아오면 출발지가 바뀌어야 하므로 캐시를 오래 들고 있지 않는다.
 *
 * 도착지는 목적지 설정 화면에서 사용자가 고른 값(useDestinationStore)을 우선 반영한다.
 * BE가 도착지를 함께 내려주기 전까지는 이 스토어 값이 실제 사용자의 선택을 담고 있다.
 */
export function useGuideInfo() {
  const destination = useDestinationStore((state) => state.destination)

  const query = useQuery({
    queryKey: queryKeys.guide.info(),
    queryFn: fetchGuideInfo,
    staleTime: 0,
    retry: false,
  })

  // 조회 결과(목/서버)의 도착지 위에 사용자가 고른 목적지를 덮어씌운다.
  // detail 같은 부가 라벨은 서버 값을 유지하고, 이름·좌표만 사용자의 선택으로 바꾼다.
  const data = useMemo<GuideInfo | undefined>(() => {
    if (!query.data) return query.data
    if (!destination) return query.data
    return {
      ...query.data,
      destination: {
        ...query.data.destination,
        name: destination.name,
        stationName: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
    }
  }, [query.data, destination])

  return { ...query, data }
}
