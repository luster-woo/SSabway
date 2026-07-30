import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { fetchGuideInfo } from '@/user/features/user-info/lib/fetchGuideInfo'

/**
 * 안내 정보(출발·도착)를 조회한다.
 *
 * 표지판을 다시 찍고 돌아오면 출발지가 바뀌어야 하므로 캐시를 오래 들고 있지 않는다.
 */
export function useGuideInfo() {
  return useQuery({
    queryKey: queryKeys.guide.info(),
    queryFn: fetchGuideInfo,
    staleTime: 0,
    retry: false,
  })
}
