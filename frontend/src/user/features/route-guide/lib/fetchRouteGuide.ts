import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'
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
 * 역 내 단계별 경로 안내를 조회한다. (POST /routes/navi)
 *
 * ⚠️ BACKEND_READY.ROUTE_GUIDE 가 false 인 동안에는 HTTP 를 보내지 않고
 * 목을 그대로 돌려준다. 배포 환경에는 MSW 가 없어서 요청을 보내면 404 로
 * 떨어지고, 경로 안내가 실패 상태에 갇히면 그 화면에서만 갈 수 있는
 * 도움 요청(→ 화상 상담)까지 함께 막힌다. 플래그 주석 참고.
 *
 * 형제 함수(fetchRoutePaths·fetchGuideInfo)와 같은 방식이다.
 *
 * TODO(BE 확정 대기):
 *   - 요청 body — 명세의 사용자 입력값(hasTrafficCard·payment·hasCash)과
 *     표지판 인식 결과(출발 지점)를 어떤 형태로 보낼지 확정 필요.
 *   - 응답의 point(도면 좌표) 포함 여부 — GuidePoint 주석 참고.
 */
export async function fetchRouteGuide(): Promise<RouteGuide> {
  if (!BACKEND_READY.ROUTE_GUIDE) {
    await delay(MOCK_LATENCY_MS)
    return MOCK_ROUTE_GUIDE
  }

  const res = await publicApi.post<ApiResponse<RouteGuide>>(
    endpoints.routes.navi,
  )
  return res.data.data
}
