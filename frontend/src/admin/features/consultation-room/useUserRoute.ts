import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import {
  PROTOTYPE_STATION_ROUTE,
  type UserRouteStep,
} from '@/shared/station-map/stationRoute'

/*
  타입(UserRouteStep)·toPointOnFloor·경로 목은 shared/station-map 으로
  승격됐다 (8/3) — 사용자 앱의 "현재 위치 보기"와 같은 지도·경로를 공유한다.
  이 파일에는 관리자용 조회 훅만 남는다.

  TODO: 상담별 경로 조회 API 신설 요청은 유효하다.
        GET /api/v1/admins/consultations/{consultationId}/route
        (GET /routes/navi 는 요청 파라미터가 사용자 입력값이라 역무원이 호출 불가)
*/

// 기존 import 경로 호환용 재수출. admin 쪽 다음 작업에서 shared 직접 참조로 바꿔 달라.
export {
  toPointOnFloor,
  type RouteStepLink,
  type UserRouteStep,
} from '@/shared/station-map/stationRoute'

const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchUserRoute(
  consultationId: number,
): Promise<UserRouteStep[]> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<{ routes: UserRouteStep[] }>>(
  //     endpoints.admin.consultationRoute(consultationId),
  //   )
  //   return res.data.data.routes
  await delay(MOCK_LATENCY_MS)

  if (!Number.isFinite(consultationId) || consultationId <= 0) {
    throw new Error('잘못된 상담 ID입니다.')
  }

  // 사용자 지도와 같은 목 경로 (shared). BE 연동 시 실제 호출로 교체한다.
  return [...PROTOTYPE_STATION_ROUTE]
}

/**
 * 사용자가 안내받는 경로.
 *
 * 모달을 열 때만 조회한다. 사용자가 재촬영해 경로가 바뀔 수 있어 캐시를 오래 두지 않는다.
 */
export function useUserRoute(consultationId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.consultation.detail(consultationId), 'route'],
    queryFn: () => fetchUserRoute(consultationId),
    enabled,
  })
}
