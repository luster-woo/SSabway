import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'
import type { RouteGuide } from '@/shared/types/routeGuide'

/**
 * 역 내 단계별 경로 안내를 조회한다. (POST /routes/navi — BE 개발전)
 *
 * 개발 중에는 MSW(mocks/handlers.ts)가 이 요청을 받아 좌표(point) 포함
 * 목 응답을 돌려준다. BE 가 배포되면 mockSwitch 에서 끄고 실서버로 검증한다.
 *
 * TODO(BE 확정 대기):
 *   - 요청 body — 명세의 사용자 입력값(hasTrafficCard·payment·hasCash)과
 *     표지판 인식 결과(출발 지점)를 어떤 형태로 보낼지 확정 필요.
 *     지금은 목이 body 를 읽지 않으므로 비워 보낸다.
 *   - 응답의 point(도면 좌표) 포함 여부 — GuidePoint 주석 참고.
 */
export async function fetchRouteGuide(): Promise<RouteGuide> {
  const res = await userApi.post<ApiResponse<RouteGuide>>(endpoints.routes.navi)
  return res.data.data
}
