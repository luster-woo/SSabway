import { isAxiosError } from 'axios'

/**
 * 목 처리에서 상태코드를 실어 보내기 위한 에러.
 *
 * BE 연동이 끝난 훅은 axios 에러를 던지므로 이 클래스를 쓰지 않는다.
 * 엔드포인트가 확정되지 않아 아직 목인 훅(비밀번호 재설정)이 남아 있어 유지한다.
 * 전 훅 연동이 끝나면 이 클래스와 instanceof 분기를 함께 지운다.
 *
 * 생성자에서 필드를 따로 선언하고 대입하는 이유는 tsconfig 의
 * erasableSyntaxOnly 가 생성자 파라미터 프로퍼티를 금지하기 때문이다.
 */
export class MockHttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`HTTP ${String(status)}`)
    this.status = status
  }
}

/**
 * 상태코드를 i18n 키로 바꾼다. 표에 없는 코드면 fallback 을 쓴다.
 *
 * axios 에러(실제 응답)와 MockHttpError(목) 둘 다 처리한다.
 * 실패 응답 본문은 { success, message } 형태로 code 필드가 없어
 * 상태코드를 키로 쓴다. code 가 확정되면 표의 키를 문자열 코드로 바꾸면 된다.
 */
export function toErrorKey(
  error: unknown,
  table: Record<number, string>,
  fallback: string,
): string {
  if (error instanceof MockHttpError) return table[error.status] ?? fallback
  if (isAxiosError(error) && error.response) {
    return table[error.response.status] ?? fallback
  }
  return fallback
}
