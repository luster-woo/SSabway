import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { RoutePathParams } from '@/shared/types/route'
import { fetchRoutePaths } from '@/user/features/route-select/lib/fetchRoutePaths'

/** 같은 출발·도착 좌표로 되돌아왔을 때 외부 API를 또 때리지 않도록 5분 캐싱한다. */
const STALE_MS = 5 * 60 * 1000

/** 출발·도착 좌표로 추천 경로 목록을 조회한다. */
export function useRoutePaths(params: RoutePathParams) {
  return useQuery({
    queryKey: queryKeys.route.path(params),
    queryFn: () => fetchRoutePaths(params),
    staleTime: STALE_MS,
    retry: false,
  })
}
