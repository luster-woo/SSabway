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
 * 비밀번호 재설정
 * ------------------------------------------------------------------ */

/**
 * "이메일 인증이 만료된 상태"를 재현할 이메일.
 *
 * 실제 서버는 인증 완료 후 30분이 지나면 재설정 요청을
 * 400 EMAIL_NOT_VERIFIED 로 거부하는데, 목으로 이 흐름을 보려면 30분을
 * 기다려야 하므로 이메일 값으로 대신 판별한다. (RATE_LIMITED_EMAIL 과 같은 방식)
 */
export const VERIFICATION_EXPIRED_EMAIL = 'expired@mail.com'

/**
 * 목이 통과시킬 비밀번호 최소 길이.
 *
 * 명세에 비밀번호 규칙이 아직 없어, 화면 안내 문구("8자 이상 입력")와
 * 회원가입 목의 기준을 그대로 쓴다. BE 규칙이 확정되면 그것을 따른다.
 */
export const MIN_PASSWORD_LENGTH = 5

/* ------------------------------------------------------------------ *
 * 인증 (로그인 · 로그아웃 · 토큰 재발급)
 * ------------------------------------------------------------------ */

/** 사용자 로그인 목 계정. 이메일은 TAKEN_EMAILS(가입된 이메일)와 같은 값을 쓴다. */
export const USER_ACCOUNT = {
  email: 'user1@mail.com',
  /** 명세 예시값 */
  password: 'example1',
}

/**
 * 관리자(역무원) 로그인 목 계정.
 *
 * 명세상 요청 본문은 { staffCode, password } 다. (useAdminLogin 참고)
 * 실서버 DB 계정과는 무관한 목 전용 값 — 실서버 연동 테스트 때는
 * mockSwitch 의 'POST /staffs/login' 을 끄고 실제 staff 계정을 쓴다.
 */
export const STAFF_ACCOUNT = {
  staffCode: 'fjhiuozasld',
  password: '12345',
}

/**
 * 로그인 응답의 language.
 *
 * 서버에 저장된 선호 언어이며, 로그인 직후 화면 언어가 이 값으로 바뀐다.
 * 명세 예시가 "EN" 이라 그대로 뒀다. 개발 중 화면이 영어로 바뀌는 게 불편하면
 * 'KO' 로 바꾸면 된다.
 */
export const USER_LANGUAGE = 'EN'

/**
 * GPS 조회가 돌려줄 역 이름. 명세의 예시값을 그대로 쓴다.
 * 목은 좌표를 보지 않으므로 어디서 실행해도 이 역이 나온다.
 */
export const NEARBY_STATION = '대구역'

/**
 * 리프레시 토큰 쿠키.
 *
 * 실제 서버는 HttpOnly 로 내려주므로 자바스크립트가 읽을 수 없지만,
 * 목에서는 재발급 핸들러가 "로그인한 적 있는지"를 판단해야 해서 일반 쿠키로 둔다.
 * 이름에 mock 을 붙여 실제 쿠키와 혼동하지 않게 한다.
 */
export const REFRESH_COOKIE = 'mockRefreshToken'

const REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 14

/** 로그인 성공 응답에 실어 보낼 Set-Cookie 값 */
export function refreshCookie(): string {
  return `${REFRESH_COOKIE}=mock; Path=/; SameSite=Lax; Max-Age=${String(REFRESH_COOKIE_MAX_AGE_SEC)}`
}

/** 로그아웃 응답에 실어 보낼 Set-Cookie 값. 쿠키를 즉시 만료시킨다. */
export function expiredRefreshCookie(): string {
  return `${REFRESH_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`
}

/**
 * 목 액세스 토큰.
 *
 * JWT 형식을 흉내내지 않는다. 목 구간에서는 아무도 이 값을 검증하지 않고,
 * 그럴듯한 JWT 를 만들어 두면 실제 토큰으로 오해할 여지만 생긴다.
 */
export function issueAccessToken(subject: string): string {
  return `mock.${subject}.${String(Date.now())}`
}

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

/**
 * 실패 응답. BE ApiResponse.error 와 같은 모양이다.
 *
 * code 는 ErrorCode enum 이름 문자열 (예: 'EMAIL_NOT_VERIFIED').
 * 프론트가 상태코드만으로 구분할 수 없는 실패(같은 400 의 형식 오류 vs
 * 인증 만료)를 가를 때 쓰므로, 그런 핸들러에서는 반드시 넣는다.
 */
export function errorBody(message: string, code?: string) {
  return { success: false, code, message }
}
