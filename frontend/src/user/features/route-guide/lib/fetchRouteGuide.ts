import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'
import type {
  NavRouteRequest,
  NavRouteResponse,
} from '@/shared/types/navigation'
import type { RouteGuide } from '@/shared/types/routeGuide'
import {
  mapNaviResponse,
  type TranslateFn,
} from '@/user/features/route-guide/lib/mapNaviResponse'

/**
 * 역 내 단계별 경로 안내를 조회한다. (POST /api/v1/routes/navi)
 *
 * 인증이 필요 없는 API 라 publicApi 를 쓴다 — 형제인 /routes/path 와 같다.
 *
 * 응답은 받자마자 화면용 구조로 옮긴다(mapNaviResponse). 훅이나 컴포넌트에서
 * 옮기면 캐시에 서버 형태가 들어가, 화면마다 매핑을 다시 하거나 서로 다르게
 * 해석하는 일이 생긴다.
 *
 * ⚠️ 실패 응답의 code 로 화면 문구가 갈린다(NAV_NO_STEP_FREE_ROUTE 등).
 *    여기서 에러를 삼키면 안 된다 — 그대로 던져 화면이 분기하게 둔다.
 */
export async function fetchRouteGuide(
  request: NavRouteRequest,
  t: TranslateFn,
): Promise<RouteGuide> {
  const res = await publicApi.post<ApiResponse<NavRouteResponse>>(
    endpoints.routes.navi,
    request,
  )

  return mapNaviResponse(res.data.data, t)
}
