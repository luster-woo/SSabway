import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'
import type {
  RoutePath,
  RoutePathParams,
  RoutePathResponse,
} from '@/shared/types/route'

/**
 * 추천 경로 목록을 조회한다. ✅ BE 개발완료 (ssabway RouteController).
 *
 *   POST /api/v1/routes/path
 *
 * `publicApi` 를 쓰는 이유: `/api/v1/routes/**` 는 permitAll 이라 토큰이
 * 필요 없고, `userApi` 로 보내면 401 을 토큰 만료로 오인한 인터셉터가
 * 재발급 → 실패 → 로그인 화면 리다이렉트까지 끌고 간다. 경로 조회는
 * 비로그인 사용도 전제이므로 인터셉터가 끼면 안 된다.
 *
 * `params` 는 BE `RouteSearchRequest` 와 필드명이 1:1이라 그대로 본문에 싣는다.
 * 다섯 필드 모두 @NotNull 이라 하나라도 빠지면 400 이다.
 *
 * 실패 케이스 (화면은 isError 로 한 번에 처리하되, 원인은 알아둘 것)
 *   404 SUBWAY_ROUTE_NOT_FOUND — 이용 가능한 지하철 경로 없음. 출발 좌표가
 *       지원 역(현재 대구역) 반경 밖이면 여기로 떨어진다.
 *   502 EXTERNAL_API_ERROR     — ODsay 장애
 */
export async function fetchRoutePaths(
  params: RoutePathParams,
): Promise<RoutePath[]> {
  const res = await publicApi.post<ApiResponse<RoutePathResponse>>(
    endpoints.routes.path,
    params,
  )

  return res.data.data.path
}
