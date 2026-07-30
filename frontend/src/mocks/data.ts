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
 * 회원가입 · 이메일 인증
 * ------------------------------------------------------------------ */

/** 이미 가입된 것으로 취급할 이메일. 중복 확인 실패 흐름 확인용 */
export const TAKEN_EMAILS = ['user1@mail.com', 'test@mail.com']

/** 인증 메일 발송 시 통과시킬 인증코드. 명세 예시값(영문+숫자 7자리) */
export const VALID_CODE = 'A7KM3PQ'

/** 인증코드 입력 제한 시간(초). 발송 응답의 timeLimit 으로 내려간다 */
export const CODE_TIME_LIMIT_SEC = 300

/**
 * 요청 초과(429)를 재현할 이메일.
 * 실제 서버로는 만들기 어려운 흐름이라 목에서만 확인한다.
 */
export const RATE_LIMITED_EMAIL = 'toomany@mail.com'

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
