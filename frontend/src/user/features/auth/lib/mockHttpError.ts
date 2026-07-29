/**
 * 목 처리에서 상태코드를 실어 보내기 위한 에러.
 *
 * BE 연동 시 axios 에러의 response.status 로 대체되므로,
 * 이 파일과 아래 toErrorKey 의 instanceof 분기는 함께 지운다.
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
 * 실패 응답 본문의 code 필드가 명세에 없어 상태코드를 키로 쓴다.
 * code 가 확정되면 표의 키를 문자열 코드로 바꾸면 된다.
 */
export function toErrorKey(
  error: unknown,
  table: Record<number, string>,
  fallback: string,
): string {
  if (error instanceof MockHttpError) return table[error.status] ?? fallback
  return fallback
}
