import { isAxiosError } from 'axios'

import type { ApiErrorBody } from '@/shared/types/api'

/**
 * 관리자 화면 실패 응답을 한국어 문구로 바꾸는 표.
 *
 * 사용자 앱은 실패를 i18n 키로 바꾸지만(auth/lib/mockHttpError 의 toErrorKey),
 * 관리자 화면은 한국어 전용이라 문구를 직접 담는다. 구조는 같다 — `byCode` 를
 * 먼저 보고, 없으면 `byStatus`, 그것도 없으면 fallback 이다.
 *
 * ⚠️ 되도록 `byCode` 를 쓸 것. 상태코드 하나에 여러 원인이 겹친다
 *    (409 하나에 중복 등록·이미 수락 등). code 는 BE ErrorCode enum 이름이다.
 */
export interface AdminErrorTable {
  /** BE ErrorCode enum 이름 → 문구. 먼저 조회한다. */
  byCode?: Record<string, string>
  /** HTTP 상태코드 → 문구. code 로 못 가렸을 때. */
  byStatus?: Record<number, string>
}

/**
 * 실패 응답을 문구로 바꾼다. 어디에도 걸리지 않으면 fallback 을 쓴다.
 *
 * ssabway 는 모든 실패 응답에 `code` 를 싣는다(ApiResponse.error). code 가 없는
 * 응답(네트워크 계층 오류, 프록시가 만든 404/502 등)은 byStatus·fallback 이 받는다.
 */
export function toAdminErrorMessage(
  error: unknown,
  table: AdminErrorTable,
  fallback: string,
): string {
  if (!isAxiosError(error) || !error.response) return fallback

  const code = (error.response.data as ApiErrorBody | undefined)?.code
  if (code) {
    const byCode = table.byCode?.[code]
    if (byCode) return byCode
  }

  return table.byStatus?.[error.response.status] ?? fallback
}
