import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { RoutePathParams } from '@/shared/types/route'
import { fetchRoutePaths } from '@/user/features/route-select/lib/fetchRoutePaths'

/**
 * 같은 조건으로 되돌아왔을 때 외부 API(ODsay)를 또 때리지 않도록 5분 캐싱한다.
 * 유료 쿼터가 걸린 외부 호출이라 뒤로가기 왕복에 민감하다.
 */
const STALE_MS = 5 * 60 * 1000

/**
 * 출발·도착 좌표로 추천 경로 목록을 조회한다.
 *
 * `retry: false` 를 유지한다. 실패의 대부분이 404 SUBWAY_ROUTE_NOT_FOUND
 * (지원하지 않는 출발역·경로 없음)라 재시도해도 결과가 같고, ODsay 호출만
 * 낭비된다. 화면은 재시도 버튼으로 사용자가 직접 다시 부르게 한다.
 *
 * @param enabled 출발지·도착지가 모두 정해졌는지. false 면 요청을 보내지 않는다.
 *   훅은 조건부로 호출할 수 없어 params 는 항상 넘어오지만, 지점이 비었을 때
 *   좌표 0 으로 조회하면 ODsay 호출만 버리고 "경로 없음"이 떠서 사용자가
 *   경로가 없는 줄 오해한다. 그 상태는 화면이 별도 안내로 처리한다.
 */
export function useRoutePaths(params: RoutePathParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.route.path(params),
    queryFn: () => fetchRoutePaths(params),
    staleTime: STALE_MS,
    retry: false,
    enabled,
  })
}
