import type { RoutePath, RoutePathParams } from '@/shared/types/route'
import { MOCK_ROUTE_PATHS } from '@/user/features/route-select/lib/mockRoutePaths'

/** 목 응답이 즉시 돌아오면 로딩 UI를 확인할 수 없어 지연을 준다. */
const MOCK_LATENCY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 추천 경로 목록을 조회한다.
 *
 * BE 개발 전이라 목 응답을 돌려준다. 연동 시 아래 주석을 살리고
 * 목 처리(delay·MOCK_ROUTE_PATHS)를 삭제한다.
 *
 *   const res = await userApi.get<ApiResponse<{ content: RoutePathContent }>>(
 *     endpoints.routes.path,
 *     { params },
 *   )
 *   return res.data.data.content.path
 */
export async function fetchRoutePaths(
  params: RoutePathParams,
): Promise<RoutePath[]> {
  await delay(MOCK_LATENCY_MS)

  // 요청 좌표를 그대로 실어 보내 응답 형식(좌표 포함)을 맞춘다.
  return MOCK_ROUTE_PATHS.map((path) => ({ ...path, ...params }))
}
