import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { NavRouteRequest } from '@/shared/types/navigation'
import { fetchRouteGuide } from '@/user/features/route-guide/lib/fetchRouteGuide'

/**
 * 역 내 단계별 경로 안내를 조회한다.
 *
 * @param request 보낼 본문. 답이 모자라 만들 수 없으면 null — 그때는 요청을
 *   보내지 않는다. 빈 본문으로 보내면 @NotNull 에 걸려 400 이고, 화면에는
 *   "경로를 찾지 못했다"로 보여 사용자가 원인을 오해한다.
 *
 * `retry: false` 를 유지한다. 실패의 대부분이 4xx(그래프에 없는 노드, 경로
 * 없음, 계단 없이 못 감)라 재시도해도 결과가 같다. 화면이 재시도 버튼을 준다.
 *
 * 표지판을 다시 찍어(경로 재탐색) 돌아오면 단계가 새로 계산되어야 하므로
 * 캐시를 들고 있지 않는다(staleTime 0). 요청 본문이 queryKey 에 들어가므로
 * 답을 바꾸면 자동으로 새로 조회된다.
 */
export function useRouteGuide(request: NavRouteRequest | null) {
  const { t } = useTranslation()

  return useQuery({
    queryKey: queryKeys.guide.navi(request),
    // enabled 가 false 면 실행되지 않지만, 타입상 null 이 들어올 수 있어 좁힌다.
    queryFn: () => fetchRouteGuide(request as NavRouteRequest, t),
    enabled: request !== null,
    staleTime: 0,
    retry: false,
  })
}
