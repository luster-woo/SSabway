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
 * 요청 본문이 그대로 queryKey 라, 표지판을 다시 찍거나(출발 노드 변경) 답을
 * 바꾸면 키가 달라져 자동으로 새로 조회된다. 반대로 **키가 같으면 결과도 같다**
 * — 서버의 역 도면 그래프는 세션 중에 바뀌지 않는다. 그래서 캐시를 들고 있는다.
 *
 * staleTime 이 0 이던 동안에는 화면이 다시 마운트될 때마다(도움 요청·화상 상담·
 * 뒤로가기) 같은 본문으로 재요청이 나갔다. 결과가 같은 호출에 매번 로딩
 * 스피너를 보여 주는 셈이라, 돌아온 사용자에게는 안내가 처음부터 다시 그려지는
 * 것처럼 보였다. gcTime 은 상담이 5분을 넘겨도 캐시가 남도록 늘려 둔다.
 */
export function useRouteGuide(request: NavRouteRequest | null) {
  const { t } = useTranslation()

  return useQuery({
    queryKey: queryKeys.guide.navi(request),
    // enabled 가 false 면 실행되지 않지만, 타입상 null 이 들어올 수 있어 좁힌다.
    queryFn: () => fetchRouteGuide(request as NavRouteRequest, t),
    enabled: request !== null,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  })
}
