import { isAxiosError } from 'axios'

/**
 * 응답 상태코드를 i18n 키로 바꾼다. 표에 없는 코드면 fallback 을 쓴다.
 *
 * 실패 응답 본문은 { success, message } 형태로 code 필드가 없어
 * 상태코드를 키로 쓴다. code 가 확정되면 표의 키를 문자열 코드로 바꾸면 된다.
 *
 * (과거 이 파일에 있던 MockHttpError 는 인라인 목 훅들이 전부 MSW + 실호출로
 * 이관되며 제거됐다. 파일명은 import 가 여럿이라 당장 바꾸지 않는다.
 * TODO: 여유 있을 때 httpErrorKey.ts 로 개명)
 */
export function toErrorKey(
  error: unknown,
  table: Record<number, string>,
  fallback: string,
): string {
  if (isAxiosError(error) && error.response) {
    return table[error.response.status] ?? fallback
  }
  return fallback
}
