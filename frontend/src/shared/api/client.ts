import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { endpoints } from '@/shared/api/endpoints'
import { env } from '@/shared/lib/env'
import { useAuthStore, type AuthRole } from '@/shared/lib/store/useAuthStore'

const LOGIN_PATH: Record<AuthRole, string> = {
  user: '/login',
  admin: '/admin/login',
}

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
  baseURL: `${env.API_BASE_URL}/api/v1`,
  withCredentials: true,
})

/** 동시 401 발생 시 refresh 요청이 중복되지 않도록 공유 */
let refreshPromise: Promise<string> | null = null

export async function refreshAccessToken(role: AuthRole): Promise<string> {
  refreshPromise ??= bareClient
    .post<{ data: { accessToken: string } }>(endpoints.auth.refresh)
    .then((res) => {
      const token = res.data.data.accessToken
      useAuthStore.getState().setAccessToken(role, token)
      return token
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

/**
 * 401 을 받아도 토큰 재발급을 시도하지 않을 경로.
 *
 * 로그인 실패의 401 은 "자격 증명이 틀렸다"는 뜻이므로 토큰을 재발급해도 결과가
 * 같다. 걸러내지 않으면 로그인 버튼 한 번에 refresh 요청이 따라 나가고,
 * 두 번째 401 에서 redirectToLogin 이 호출돼 화면이 통째로 새로고침된다.
 *
 * 로그아웃·재발급은 인터셉터가 없는 bareClient 를 쓰므로 여기에 넣지 않는다.
 * 관리자 로그인을 연동할 때 endpoints.admin.login 을 여기에 추가할 것.
 */
const NO_RETRY_PATHS: string[] = [endpoints.users.login]

function redirectToLogin(role: AuthRole) {
  useAuthStore.getState().clearAccessToken(role)
  if (window.location.pathname !== LOGIN_PATH[role]) {
    window.location.href = LOGIN_PATH[role]
  }
}

function createClient(role: AuthRole): AxiosInstance {
  const instance = axios.create({
    baseURL: `${env.API_BASE_URL}/api/v1`,
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
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
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

/** 앱 부팅 시 1회 호출. 쿠키의 리프레시 토큰으로 세션 복구 */
export async function restoreSession(role: AuthRole): Promise<boolean> {
  try {
    await refreshAccessToken(role)
    return true
  } catch {
    useAuthStore.getState().setStatus(role, 'unauthenticated')
    return false
  }
}
