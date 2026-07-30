import type { RouteGuide } from '@/shared/types/routeGuide'
import { MOCK_ROUTE_GUIDE } from '@/user/features/route-guide/lib/mockRouteGuide'

/** 목 응답이 즉시 돌아오면 로딩 UI를 확인할 수 없어 지연을 준다. */
const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 역 내 단계별 경로 안내를 조회한다.
 *
 * BE 개발 전이라 목 응답을 돌려준다. 연동 시 아래 주석을 살리고
 * 목 처리(delay·MOCK_ROUTE_GUIDE)를 삭제한다.
 *
 *   const res = await userApi.get<ApiResponse<RouteGuide>>(endpoints.routes.navi)
 *   return res.data.data
 */
export async function fetchRouteGuide(): Promise<RouteGuide> {
  await delay(MOCK_LATENCY_MS)
  return MOCK_ROUTE_GUIDE
}
