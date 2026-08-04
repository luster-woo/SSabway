import { IS_DEV } from '@/shared/lib/env'
import type { AuthRole } from '@/shared/lib/store/useAuthStore'

/**
 * 백엔드 JwtProvider 가 액세스 토큰에 싣는 클레임.
 * (global/jwt/JwtProvider.java — TYPE_CLAIM = "type", TokenType = USER | STAFF)
 */
const TYPE_CLAIM = 'type'

const ROLE_BY_TOKEN_TYPE: Record<string, AuthRole> = {
  USER: 'user',
  STAFF: 'admin',
}

/** base64url → 문자열. JWT 페이로드는 표준 base64 가 아니라 base64url 이다. */
function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  // atob 는 latin1 을 주므로 UTF-8 로 다시 읽는다. 클레임에 한글이 와도 안전하다.
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * 액세스 토큰이 어느 역할용인지 읽는다. 읽을 수 없으면 null.
 *
 * ⚠️ 서명을 검증하지 않는다. 검증은 서버가 한다(JwtAuthenticationFilter).
 *    여기서 읽는 목적은 "이 토큰을 어느 슬롯에 넣을지" 하나뿐이다.
 *    화면 라우팅용 판단이지 권한 판단이 아니다 — 위조된 토큰을 들고 관리자
 *    화면에 들어가더라도 모든 관리자 API 가 403 을 준다.
 *
 * 왜 필요한가:
 *   `/auth/refresh` 는 accessToken 하나만 돌려주고 역할을 알려주지 않는다
 *   (AuthService.reissue). 쿠키는 user·admin 이 같은 이름을 쓰므로, 사용자로
 *   로그인한 브라우저에서 /admin 에 들어가면 재발급이 200 을 돌려주고
 *   프론트는 그것을 관리자 세션으로 착각한다. 그 착각을 여기서 막는다.
 */
export function readTokenRole(token: string): AuthRole | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const claims = JSON.parse(decodeBase64Url(payload)) as Record<
      string,
      unknown
    >
    const type = claims[TYPE_CLAIM]

    if (typeof type !== 'string') return null
    return ROLE_BY_TOKEN_TYPE[type] ?? null
  } catch {
    if (IS_DEV) console.warn('[auth] 액세스 토큰의 type 클레임을 읽지 못했다')
    return null
  }
}
