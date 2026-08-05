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
 * 관리자 — 사용자 위치 보기 (GET /staffs/consultations/{id}/route)
 * ------------------------------------------------------------------ */

/**
 * 역무원 화면이 그릴 사용자의 역 내 경로.
 *
 * 대구역 파일럿 구간(1번 출구 EX0_01 → 개찰구 GA0_01)의 실제 엣지 id 다.
 * `docs/map/daegu_navigation.json` 의 그래프에서 최단 경로로 뽑았고,
 * 지도(daeguNavigation.ts)의 DAEGU_EDGES 에 모두 존재하는 값이라 선이
 * 도면 통로를 따라 그려진다. 사용자 쪽 하드코딩(useStationNodeStore 의
 * PILOT_STATION_NODE)과 같은 출발·도착이라 두 화면이 같은 길을 보여준다.
 *
 * ⚠️ 도면 그래프가 갱신되면 여기 edgeId 도 함께 확인할 것. 없는 edgeId 는
 *    노드끼리 직선으로 대체 그려지므로(routePath.toStepPath) 조용히
 *    벽을 뚫는 선이 된다.
 */
export const MOCK_USER_ROUTE_STEPS = [
  { edgeId: 'E066', from: 'EX0_01', to: 'S2_08' },
  { edgeId: 'E056', from: 'S2_08', to: 'S1_12' },
  { edgeId: 'E053', from: 'S1_12', to: 'S1_11' },
  { edgeId: 'E048', from: 'S1_11', to: 'S1_10' },
  { edgeId: 'E045', from: 'S1_10', to: 'S1_09' },
  { edgeId: 'E044', from: 'S1_09', to: 'S1_08' },
  { edgeId: 'E040', from: 'S1_08', to: 'S2_10' },
  { edgeId: 'E037', from: 'S2_10', to: 'S2_05' },
  { edgeId: 'E036', from: 'S2_05', to: 'S2_04' },
  { edgeId: 'E035', from: 'S2_04', to: 'S2_03' },
  { edgeId: 'E033', from: 'S2_03', to: 'S2_02' },
  { edgeId: 'E032', from: 'S2_02', to: 'S2_01' },
  { edgeId: 'E030', from: 'S2_01', to: 'S3_05' },
  { edgeId: 'E006', from: 'S3_05', to: 'S3_15' },
  { edgeId: 'E007', from: 'S3_15', to: 'EV3_02' },
  { edgeId: 'E088', from: 'EV3_02', to: 'EV2_02' },
  { edgeId: 'E022', from: 'EV2_02', to: 'S3_17' },
  { edgeId: 'E023', from: 'S3_17', to: 'S3_18' },
  { edgeId: 'E024', from: 'S3_18', to: 'GA0_01' },
]

/**
 * 사용자가 보고 있는 단계 (0부터).
 *
 * 목이라 고정값이다 — 실서버가 붙으면 사용자가 [다음] 을 누른 만큼 올라간다.
 * 앞뒤로 지나온 구간·남은 구간이 모두 보이도록 중간이 아닌 앞쪽을 골랐다.
 */
export const MOCK_USER_ROUTE_CURRENT_INDEX = 3

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
