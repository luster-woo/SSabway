import { isAxiosError } from 'axios'

import type { ApiErrorBody } from '@/shared/types/api'

/**
 * 실패 응답을 i18n 키로 바꾸는 표.
 *
 * `byCode` 를 먼저 보고, 없으면 `byStatus`, 그것도 없으면 fallback 이다.
 *
 * ⚠️ 되도록 `byCode` 를 쓸 것. 상태코드는 여러 원인이 겹친다.
 *    - 401 하나에 LOGIN_FAILED · SOCIAL_LOGIN_REQUIRED · PASSWORD_MISMATCH ·
 *      ACCESS_TOKEN_EXPIRED · INVALID_TOKEN 이 모두 몰려 있다.
 *    - 400 하나에 INVALID_INPUT_VALUE(형식) 와 EMAIL_NOT_VERIFIED(인증 만료) 가
 *      같이 있다. 이 둘을 뭉개면 "입력 형식이 올바르지 않아요" 만 뜨는데,
 *      사용자는 비밀번호만 계속 고치며 영영 통과하지 못한다.
 *
 *    `byStatus` 는 code 가 없는 응답(webrtc 봉투, 네트워크 계층 오류, 프록시가
 *    만든 404/502 등)을 위한 그물로만 남긴다.
 */
export interface ErrorKeyTable {
  /** BE ErrorCode enum 이름 → i18n 키. 먼저 조회한다. */
  byCode?: Record<string, string>
  /** HTTP 상태코드 → i18n 키. code 로 못 가렸을 때. */
  byStatus?: Record<number, string>
}

/**
 * 실패 응답을 i18n 키로 바꾼다. 어디에도 걸리지 않으면 fallback 을 쓴다.
 *
 * BE(ssabway)는 모든 실패 응답에 `code` 를 실어 보낸다 —
 * `ApiResponse.error(ErrorCode)` 가 `errorCode.name()` 을 그대로 넣고,
 * GlobalExceptionHandler 가 모든 BusinessException 을 그 형태로 내보낸다.
 * (한동안 "실패 본문에 code 필드가 없다"는 전제로 상태코드만 보고 있었는데
 *  사실이 아니었다. 그 전제로 쓰인 주석들도 함께 정리했다)
 *
 * (과거 이 파일에 있던 MockHttpError 는 인라인 목 훅들이 전부 MSW + 실호출로
 * 이관되며 제거됐다. 파일명은 import 가 여럿이라 당장 바꾸지 않는다.
 * TODO: 여유 있을 때 httpErrorKey.ts 로 개명)
 */
export function toErrorKey(
  error: unknown,
  table: ErrorKeyTable,
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
