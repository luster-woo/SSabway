/**
 * 목 데이터 모음.
 *
 * 핸들러(handlers.ts)가 응답으로 쓰는 값을 전부 이 파일에 모아둔다.
 * "어떤 값으로 테스트되는지"를 한 곳에서 확인·수정하기 위함이다.
 * 요청을 가로채는 규칙은 handlers.ts, 값은 이 파일로 역할을 나눈다.
 *
 * BE 연동이 끝난 엔드포인트는 handlers.ts 에서 핸들러를 지우고
 * 여기서도 관련 값을 함께 지운다.
 */

/* ------------------------------------------------------------------ *
 * 공통 응답 형태
 * ------------------------------------------------------------------ */

/** BE 의 ApiResponse 와 같은 모양으로 맞춘다 (success / message / data) */
export function okBody<T>(message: string, data: T) {
  return { success: true, message, data }
}

export function okBodyWithoutData(message: string) {
  return { success: true, message }
}

export function errorBody(message: string) {
  return { success: false, message }
}
