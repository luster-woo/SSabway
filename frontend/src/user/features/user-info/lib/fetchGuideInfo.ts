import type { GuideInfo } from '@/shared/types/guide'
import { MOCK_GUIDE_INFO } from '@/user/features/user-info/lib/mockGuideInfo'

/** 목 응답이 즉시 돌아오면 로딩 UI를 확인할 수 없어 지연을 준다. */
const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 안내 정보(출발·도착)를 조회한다.
 *
 * BE 개발 전이라 목 응답을 돌려준다. 연동 시 아래 주석을 살리고
 * 목 처리(delay·MOCK_GUIDE_INFO)를 삭제한다.
 *
 *   const res = await userApi.get<ApiResponse<GuideInfo>>(endpoints.routes.navi)
 *   return res.data.data
 */
export async function fetchGuideInfo(): Promise<GuideInfo> {
  await delay(MOCK_LATENCY_MS)
  return MOCK_GUIDE_INFO
}
