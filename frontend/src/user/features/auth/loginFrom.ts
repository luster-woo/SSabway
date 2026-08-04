/**
 * 로그인 화면으로 보낼 때 함께 넘기는 라우터 state.
 *
 * 로그인 성공 후 돌아갈 곳을 히스토리(`navigate(-1)`)로 찾으면 안 된다.
 * 회원가입·비밀번호 재설정이 완료 후 `navigate('/login', { replace: true })`
 * 로 이동하면서 직전 항목을 덮어써, 히스토리가 `[..., /login, /login]` 이
 * 되는 경로가 있다. 그 상태에서 한 칸 되돌리면 다시 로그인 화면에 도착해
 * "로그인 버튼이 씹힌 것처럼" 보인다. (두 번 누르면 그때야 넘어간다)
 *
 * 그래서 목적지를 state 로 명시해 들고 다닌다.
 */
export interface LoginFromState {
  /** 로그인 성공 후 돌아갈 경로 */
  from?: string
}

/** state 가 없을 때(주소 직접 입력·새로고침) 돌아갈 곳 */
export const DEFAULT_LOGIN_FROM = '/'

/**
 * 라우터 state 에서 돌아갈 경로를 읽는다. 없거나 형식이 이상하면 시작 페이지.
 *
 * `state` 는 사용자가 히스토리를 조작해 아무 값이나 넣을 수 있으므로
 * 앱 내부 경로("/" 로 시작)인지 확인한다. 외부 URL 로 튕기지 않게 하는 최소 방어다.
 */
export function readLoginFrom(state: unknown): string {
  const from = (state as LoginFromState | null)?.from
  if (typeof from !== 'string') return DEFAULT_LOGIN_FROM
  if (!from.startsWith('/') || from.startsWith('//')) return DEFAULT_LOGIN_FROM
  return from
}
