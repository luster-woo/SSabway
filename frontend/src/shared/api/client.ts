import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { endpoints } from '@/shared/api/endpoints'
import { readTokenRole } from '@/shared/api/tokenRole'
import { env } from '@/shared/lib/env'
import { clearSessionHint } from '@/shared/lib/sessionHint'
import { useAuthStore, type AuthRole } from '@/shared/lib/store/useAuthStore'

const LOGIN_PATH: Record<AuthRole, string> = {
  user: '/login',
  admin: '/admin/login',
}

/** 모든 요청의 공통 접두사. axios 인스턴스와 keepalive 요청이 함께 쓴다. */
const API_ROOT = `${env.API_BASE_URL}/api/v1`

/**
 * 인터셉터가 없는 인스턴스.
 *
 * 401 재시도와 로그인 리다이렉트가 오히려 방해가 되는 두 요청에 쓴다.
 *   - 토큰 재발급: 이 요청 자체가 401 을 받으므로 재시도하면 무한 루프가 된다.
 *   - 로그아웃: 토큰이 이미 만료돼 401 이 와도 로컬 정리로 끝내야 한다.
 *
 * 리프레시 토큰은 쿠키로 오가므로 withCredentials 는 여기에도 필요하다.
 */
const bareClient = axios.create({
  baseURL: API_ROOT,
  // userApi 와 같은 값. 없으면 네트워크가 멈췄을 때 요청이 무한정 걸려 있는다.
  timeout: 10_000,
  withCredentials: true,
})

/**
 * 비로그인 상태에서 호출하는 공개 API 용 인스턴스. (bareClient 와 동일 객체)
 *
 * 비밀번호 재설정처럼 401 이 "토큰 만료"가 아니라 "이메일 인증 만료"를 뜻하는
 * 엔드포인트는 userApi 를 쓰면 안 된다. userApi 의 인터셉터가 401 을 보고
 * 토큰 재발급 → 실패 → 로그인 화면 리다이렉트까지 가버려서, 화면이 "인증이
 * 만료됐어요" 문구를 보여줄 기회 자체가 사라진다.
 *
 * 참고: 회원가입·이메일 인증도 공개 API 지만 성공 흐름에서 401 을 만나지 않아
 * userApi 로도 동작한다. 새로 붙이는 공개 엔드포인트는 이쪽을 쓰는 게 안전하다.
 */
export const publicApi: AxiosInstance = bareClient

/**
 * 동시 401 발생 시 refresh 요청이 중복되지 않도록 공유한다.
 *
 * role 별로 따로 들고 있어야 한다. 하나로 합치면 user 와 admin 이 거의 동시에
 * 재발급을 시도했을 때 뒤에 온 쪽이 앞의 Promise 를 그대로 받아, 자기 슬롯에는
 * 토큰이 저장되지 않았는데 성공을 돌려받는다. (status 가 'idle' 로 남는다)
 */
const refreshPromises: Record<AuthRole, Promise<string> | null> = {
  user: null,
  admin: null,
}

export function refreshAccessToken(role: AuthRole): Promise<string> {
  const pending = refreshPromises[role]
  if (pending) return pending

  const promise = bareClient
    .post<{ data: { accessToken: string } }>(endpoints.auth.refresh)
    .then((res) => {
      const token = res.data.data.accessToken

      /*
        받은 토큰이 정말 이 역할의 것인지 확인한다.

        /auth/refresh 는 accessToken 만 돌려주고 역할을 알려주지 않는데
        (AuthService.reissue), 리프레시 쿠키는 user·admin 이 같은 이름을 쓴다.
        그래서 사용자로 로그인한 브라우저에서 /admin 에 들어가면 재발급이 200 을
        돌려주고, 확인하지 않으면 프론트가 그것을 관리자 세션으로 착각한다.
        관리자 화면이 열리고 그 안의 모든 API 가 403 을 내는 상태가 된다.

        토큰의 type 클레임을 못 읽으면(null) 막지 않는다. 서버가 형식을 바꿨을 때
        로그인 자체가 불가능해지는 편이 더 나쁘고, 실제 권한은 서버가 판정한다.
      */
      const tokenRole = readTokenRole(token)
      if (tokenRole !== null && tokenRole !== role) {
        throw new Error(
          `재발급된 토큰의 역할이 다르다: 기대 ${role}, 실제 ${tokenRole}`,
        )
      }

      useAuthStore.getState().setAccessToken(role, token)
      return token
    })
    .finally(() => {
      refreshPromises[role] = null
    })

  refreshPromises[role] = promise
  return promise
}

/**
 * 401 을 받아도 토큰 재발급을 시도하지 않을 경로.
 *
 * 로그인 실패의 401 은 "자격 증명이 틀렸다"는 뜻이므로 토큰을 재발급해도 결과가
 * 같다. 걸러내지 않으면 로그인 버튼 한 번에 refresh 요청이 따라 나가고,
 * 두 번째 401 에서 redirectToLogin 이 호출돼 화면이 통째로 새로고침된다.
 *
 * 구글 로그인도 마찬가지다. 게다가 여기서 재발급을 시도하면 인터셉터가 던지는
 * 에러가 원래의 401 이 아니라 refreshError 로 바뀌어, 호출한 훅이 상태코드를
 * 읽지 못해 "구글 인증 거부" 문구 대신 공통 실패 문구를 보여준다.
 *
 * 로그아웃·재발급은 인터셉터가 없는 bareClient 를 쓰므로 여기에 넣지 않는다.
 */
const NO_RETRY_PATHS: string[] = [
  endpoints.users.login,
  endpoints.users.googleLogin,
  endpoints.admin.login,
]

/**
 * 스프링 시큐리티의 권한 불일치(403)만 골라낸다.
 *
 * 403 을 뭉뚱그려 로그아웃시키면 안 된다. 업무 규칙으로도 403 이 나오기 때문이다.
 *   - CONSULTATION_ACCESS_DENIED — 자기에게 배정되지 않은 상담을 수락
 *   - CONSULTATION_BLOCKED / BLACKLISTED_USER — 블랙리스트 사용자의 상담 요청
 * 이건 화면이 문구로 처리해야 할 실패이지 세션 문제가 아니다. 로그인으로 보내면
 * 역무원이 남의 대기를 눌렀다는 이유로 로그아웃되는 황당한 동작이 된다.
 *
 * ssabway 는 시큐리티 단계의 거부에만 code 를 'FORBIDDEN' 으로 실어 보낸다
 * (global/jwt/JwtAccessDeniedHandler → ErrorCode.FORBIDDEN). 업무 403 은 각각
 * 고유한 code 를 갖는다. 그래서 code 가 정확히 'FORBIDDEN' 일 때만 참이다.
 *
 * ⚠️ webrtc(signaling) 는 응답 봉투에 code 자체가 없어(common/response/ApiResponse
 *    가 success·data·message 3필드) 구분할 방법이 없다. 그 경우는 보수적으로
 *    false — 잘못 로그아웃시키느니 호출한 훅이 에러를 그대로 받게 둔다.
 *    BE 가 webrtc 봉투에 code 를 추가하면 이 함수는 자동으로 그쪽도 커버한다.
 */
function isAuthorityMismatch(error: AxiosError): boolean {
  if (error.response?.status !== 403) return false
  const code = (error.response.data as { code?: string } | undefined)?.code
  return code === 'FORBIDDEN'
}

function redirectToLogin(role: AuthRole) {
  useAuthStore.getState().clearAccessToken(role)
  if (window.location.pathname !== LOGIN_PATH[role]) {
    window.location.href = LOGIN_PATH[role]
  }
}

function createClient(role: AuthRole): AxiosInstance {
  const instance = axios.create({
    baseURL: API_ROOT,
    timeout: 10_000,
    withCredentials: true,
  })

  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken[role]
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error)
      }

      /**
       * 권한이 어긋난 토큰으로는 재발급을 해도 결과가 같다. 슬롯을 비우고
       * 로그인 화면으로 보낸다.
       *
       * 이 분기가 없으면 화면은 "로그인됨"인데 모든 API 가 403 을 받는 상태에
       * 영구히 갇힌다. 실제로 일어나는 경로가 있다 — BE 가 user/staff 리프레시
       * 토큰을 같은 이름·같은 path 의 쿠키 하나로 관리해서
       * (RefreshTokenCookieProvider.COOKIE_NAME), 같은 브라우저에서 두 앱을
       * 오가면 재발급이 반대 역할의 토큰을 내려준다. 그 토큰을 자기 슬롯에
       * 저장한 순간부터 401 이 아니라 403 만 계속 받으므로 아래 재발급 분기가
       * 아예 돌지 않는다.
       *
       * 근본 수정은 BE 의 쿠키 분리다. 그게 끝나면 이 분기는 거의 도달하지
       * 않지만, 권한 체계가 바뀔 때의 안전망으로 남겨 둔다.
       */
      if (isAuthorityMismatch(error)) {
        redirectToLogin(role)
        return Promise.reject(error)
      }

      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      const config = error.config as
        (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined

      // 로그인 실패는 훅이 화면 문구로 바꿔 보여준다. 여기서 손대지 않는다.
      if (config?.url && NO_RETRY_PATHS.includes(config.url)) {
        return Promise.reject(error)
      }

      if (!config || config._retried) {
        redirectToLogin(role)
        return Promise.reject(error)
      }

      config._retried = true

      try {
        const token = await refreshAccessToken(role)
        config.headers.Authorization = `Bearer ${token}`
        return instance.request(config)
      } catch (refreshError) {
        redirectToLogin(role)
        return Promise.reject(refreshError)
      }
    },
  )

  return instance
}

export const userApi = createClient('user')
export const adminApi = createClient('admin')

/**
 * 로그아웃. 서버가 리프레시 토큰을 무효화하고, 로컬 액세스 토큰을 지운다.
 *
 * 요청이 실패해도 로컬 정리는 반드시 한다. 토큰이 이미 만료됐거나(401)
 * 네트워크가 끊겼을 때 화면이 로그인 상태로 남으면, 사용자는 로그아웃을
 * 눌렀는데도 로그인된 화면을 보게 된다.
 *
 * 관리자의 staffCode 처럼 앱별로 더 지울 것이 있으면 호출한 쪽에서 처리한다.
 * shared 는 admin/user 코드를 참조할 수 없다.
 */
export async function requestLogout(role: AuthRole): Promise<void> {
  const token = useAuthStore.getState().accessToken[role]

  try {
    await bareClient.post(endpoints.auth.logout, null, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  } catch {
    // 무효화 실패는 화면에 알리지 않는다. 남은 리프레시 토큰은 만료로 정리된다.
  } finally {
    useAuthStore.getState().clearAccessToken(role)
  }
}

/**
 * 페이지가 사라지는 순간에 보내는 PATCH. 결과를 기다리지 않는다.
 *
 * 왜 axios 가 아닌가 — 탭을 닫거나 백그라운드로 보내면 XHR 은 중간에 취소될
 * 수 있다. 왜 navigator.sendBeacon 이 아닌가 — Authorization 헤더를 실을 수
 * 없다. fetch 의 keepalive 가 둘 다 해결한다(문서가 언로드된 뒤에도 전송이
 * 이어지고, 헤더는 그대로 붙는다).
 *
 * ⚠️ keepalive 요청의 본문은 브라우저가 64KB 로 제한한다. 언어 코드처럼 아주
 *    작은 본문에만 쓸 것.
 * ⚠️ 인터셉터를 타지 않아 401 재발급이 없다. 이탈 중에 재발급까지 이어갈 수는
 *    없으므로, 실패해도 화면에 영향이 없는 요청에만 쓴다.
 *
 * 토큰이 없으면(비로그인) 아무것도 보내지 않는다.
 */
export function sendKeepalivePatch(
  role: AuthRole,
  path: string,
  body: unknown,
): void {
  const token = useAuthStore.getState().accessToken[role]
  if (!token) return

  void fetch(`${API_ROOT}${path}`, {
    method: 'PATCH',
    keepalive: true,
    // 리프레시 토큰 쿠키를 함께 보낸다. (axios 의 withCredentials 와 같은 뜻)
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // 이탈 중이라 결과를 반영할 화면이 없다.
  })
}

/**
 * 앱 부팅 시 1회 호출. 쿠키의 리프레시 토큰으로 세션 복구.
 *
 * 액세스 토큰은 메모리에만 있어서 새로고침하면 사라진다. 이 함수가 없으면
 * 쿠키가 살아 있어도 화면은 비로그인으로 시작하고, 인터셉터의 재발급은
 * 보호 API 가 401 을 받을 때만 돌기 때문에 아무 일도 일어나지 않는다.
 *
 * 직접 부르지 말고 `useRestoreSession(role)` 을 쓴다. 그쪽이 status 가
 * 'idle' 인지 확인해 중복 호출을 막고, 로그인한 적 없는 브라우저에서는
 * 아예 부르지 않는다(shared/lib/sessionHint.ts).
 */
export async function restoreSession(role: AuthRole): Promise<boolean> {
  try {
    await refreshAccessToken(role)
    return true
  } catch (error) {
    /*
      서버가 쿠키를 거부했을 때만 로그인 흔적을 지운다.

      네트워크 오류·타임아웃에서도 지우면, 지하에서 앱을 한 번 열었다는 이유로
      다음 접속부터 복구를 아예 시도하지 않게 된다. 이 앱은 역 구내에서
      네트워크 없이 열리는 것을 전제하므로 실제로 밟는 경로다. 연결 문제라면
      표식을 남겨 두고 다음 부팅에서 다시 시도한다.

      토큰의 역할이 어긋나 던진 경우(refreshAccessToken)도 여기서는 지우지
      않는다. 세션이 끝난 것이 아니라 BE 의 쿠키 이름 충돌이므로, 다음 부팅에
      한 번 더 시도할 여지를 남긴다.
    */
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined
    if (status === 401 || status === 403) clearSessionHint(role)

    useAuthStore.getState().setStatus(role, 'unauthenticated')
    return false
  }
}
