import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { RouteStepRef } from '@/shared/station-map/routePath'
import type { ApiResponse } from '@/shared/types/api'

/**
 * 역무원이 볼 사용자의 역 내 위치.
 *
 * 사용자 앱의 "역 내에서 현재 위치 보기"와 **같은 지도·같은 데이터**를 쓴다
 * (shared/station-map/StationMapOverlay). 그래서 여기서 다루는 값도 사용자
 * 경로 상세 안내과 같은 모양이다 — 지도에 필요한 세 필드(edgeId·from·to)와,
 * 사용자가 지금 보고 있는 단계 인덱스.
 *
 * ⚠️ 층·좌표를 담던 옛 모델(UserRouteStep)은 쓰지 않는다. 지도가 도면 그래프
 *    (daeguNavigation)의 엣지를 따라 선을 그리도록 바뀌었기 때문이다.
 */
export interface UserRouteSnapshot {
  /**
   * 사용자가 보고 있는 단계 (0부터). 이 단계의 from 이 사용자의 현재 위치다.
   *
   * 위치의 근거는 GPS 가 아니라 "마지막으로 인식·확인한 표지판"이다.
   * 사용자가 [다음] 을 누르면 올라간다.
   */
  currentIndex: number
  steps: RouteStepRef[]
}

async function fetchUserRoute(
  consultationId: number,
): Promise<UserRouteSnapshot> {
  const response = await adminApi.get<ApiResponse<UserRouteSnapshot>>(
    endpoints.admin.consultationRoute(consultationId),
  )

  const data = response.data.data
  return {
    // 서버가 범위 밖 값을 주더라도 지도가 깨지지 않게 여기서 한 번 막는다.
    currentIndex: Number.isInteger(data.currentIndex) ? data.currentIndex : 0,
    steps: data.steps,
  }
}

/**
 * 사용자가 안내받는 역 내 경로.
 *
 * ⚠️ 이 API 는 아직 BE 에 없다 (8/5 신설 요청). 지금은 MSW 목이 응답한다 —
 *    mockSwitch.ts 의 'GET /staffs/consultations/:consultationId/route' 가
 *    true 이고, 응답 값은 mocks/data.ts 의 MOCK_USER_ROUTE_* 다.
 *    (USE_MSW 를 끈 환경에서는 404 라서 화면에 조회 실패가 뜬다)
 *
 * 모달을 열 때만 조회한다. 사용자가 재촬영해 경로가 바뀔 수 있어 캐시를
 * 오래 두지 않는다.
 */
export function useUserRoute(consultationId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.consultation.detail(consultationId), 'route'],
    queryFn: () => fetchUserRoute(consultationId),
    enabled,
  })
}
