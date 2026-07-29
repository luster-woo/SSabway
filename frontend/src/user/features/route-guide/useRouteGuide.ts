import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { fetchRouteGuide } from '@/user/features/route-guide/lib/fetchRouteGuide'

/**
 * 역 내 단계별 경로 안내를 조회한다.
 *
 * 표지판을 다시 찍어(경로 재탐색) 돌아오면 단계가 새로 계산되어야 하므로
 * 캐시를 들고 있지 않는다.
 */
export function useRouteGuide() {
  return useQuery({
    queryKey: queryKeys.guide.navi(),
    queryFn: fetchRouteGuide,
    staleTime: 0,
    retry: false,
  })
}
