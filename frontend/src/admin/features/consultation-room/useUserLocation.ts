import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { ApiResponse } from '@/shared/types/api'

/** `GET /staffs/consultations/{id}/location` 응답 data (BE 8/5 신설) */
interface UserLocationResponse {
  /** 사용자의 역 내 현재 위치 노드 id (도면 그래프 기준. 예: "S3_02") */
  currentNodeId: string
}

async function fetchUserLocation(consultationId: number): Promise<string> {
  const response = await adminApi.get<ApiResponse<UserLocationResponse>>(
    endpoints.admin.consultationLocation(consultationId),
  )
  return response.data.data.currentNodeId
}

/**
 * 역무원이 볼 사용자의 역 내 현재 위치 노드. ✅ BE 개발완료 (8/5).
 *
 * 값의 근거는 GPS 가 아니라 상담 요청이다 — 사용자가 `POST /consultations` 에
 * 실어 보낸 currentNodeId(요청 시점에 마지막으로 보고 있던 안내 단계의 from)를
 * 서버가 보관했다가 그대로 돌려준다. 그래서 통화 중에 사용자가 움직여도 이
 * 값은 바뀌지 않는다 — "도움을 요청한 지점"으로 읽어야 한다.
 *
 * 모달을 열 때만 조회한다. 요청 시점 값이라 폴링할 이유는 없지만,
 * 모달을 닫았다 다시 열면 재조회된다(캐시를 오래 두지 않는다).
 *
 * ⚠️ 경로 전체 + 진행 단계를 주는 GET …/route 는 BE 에 신설되지 않았다.
 *    옛 useUserRoute(목 응답)는 이 훅으로 대체되어 삭제했다 (8/5).
 */
export function useUserLocation(consultationId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.consultation.detail(consultationId), 'location'],
    queryFn: () => fetchUserLocation(consultationId),
    enabled,
  })
}
