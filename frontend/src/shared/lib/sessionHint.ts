import type { AuthRole } from '@/shared/lib/store/useAuthStore'

/**
 * "이 브라우저에서 로그인한 적이 있다" 는 흔적.
 *
 * 왜 필요한가:
 *   리프레시 토큰은 HttpOnly 쿠키라 JS 가 읽을 수 없고, 액세스 토큰은 메모리에만
 *   있어서 새로고침이면 사라진다. 그래서 부팅 시점의 프론트는 "한 번도 로그인한
 *   적 없는 사용자" 와 "로그인했다가 새로고침한 사용자" 를 구분할 정보가 없다.
 *   구분하지 못하면 세션 복구(restoreSession)를 일단 던져 볼 수밖에 없고,
 *   비로그인 사용자의 첫 접속마다 POST /auth/refresh 가 401 을 받는다.
 *
 *   그 판단 재료를 프론트가 직접 남긴다. 로그인에 성공하면 표식을 켜고,
 *   세션이 끝나면(로그아웃·탈퇴·서버가 쿠키를 거부) 끈다. 표식이 없으면
 *   복구를 시도할 이유가 없으므로 요청 자체를 보내지 않는다.
 *
 * ⚠️ 이건 인증이 아니라 힌트다. 값이 있다고 로그인된 것이 아니고, 위조해도
 *    얻는 것이 없다(재발급의 진짜 근거는 쿠키이고 판정은 서버가 한다).
 *    그러니 토큰이나 사용자 정보를 여기에 담지 말 것.
 *
 * ⚠️ 표식과 쿠키는 만료 시점이 다를 수 있다. 쿠키만 먼저 만료되면 부팅 때
 *    재발급이 한 번 실패하고, 그 401 을 보고 표식을 끈다(client.ts 의
 *    restoreSession). 반대로 사용자가 사이트 데이터를 지우면 둘 다 사라진다.
 *
 * localStorage 인 이유: sessionStorage 는 탭을 닫으면 사라져서 "다시 방문했을 때
 * 로그인이 유지된다" 는 목적 자체를 달성하지 못한다. 역무실 공용 PC 를 전제한
 * staffCode(useAdminProfileStore)와 달리, 이 값은 남아도 개인정보가 아니다.
 */
const STORAGE_KEY: Record<AuthRole, string> = {
  user: 'auth_session_hint_user',
  admin: 'auth_session_hint_admin',
}

const HINT_VALUE = '1'

/**
 * localStorage 접근은 던질 수 있다. iOS 사파리 프라이빗 모드나 서드파티 쿠키
 * 차단 환경에서 접근 자체가 SecurityError 가 되는 브라우저가 있다.
 * 저장소를 못 쓰는 것이 앱이 뜨지 않을 이유는 아니므로 조용히 삼킨다.
 */
function safely<T>(run: () => T, fallback: T): T {
  try {
    return run()
  } catch {
    return fallback
  }
}

/** 로그인 성공 시 호출. 이 역할로 로그인한 적이 있다고 표시한다. */
export function markSessionHint(role: AuthRole): void {
  safely(() => localStorage.setItem(STORAGE_KEY[role], HINT_VALUE), undefined)
}

/** 세션이 끝났을 때 호출. 로그아웃·탈퇴·쿠키 거부가 여기에 해당한다. */
export function clearSessionHint(role: AuthRole): void {
  safely(() => localStorage.removeItem(STORAGE_KEY[role]), undefined)
}

/**
 * 세션 복구를 시도해 볼 이유가 있는가.
 *
 * false 면 재발급 요청을 보내지 않는다. 저장소를 읽지 못하는 환경에서는
 * true 를 돌려준다 — 헛요청 한 번이, 쿠키가 살아 있는데도 로그인이 풀리는
 * 것보다 낫다.
 */
export function hasSessionHint(role: AuthRole): boolean {
  return safely(
    () => localStorage.getItem(STORAGE_KEY[role]) === HINT_VALUE,
    true,
  )
}
