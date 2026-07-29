import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@/shared/lib/env'
import { useAuthStore, type AuthRole } from '@/shared/lib/store/useAuthStore'

const LOGIN_PATH: Record<AuthRole, string> = {
  user: '/login',
  admin: '/admin/login',
}

/** 리프레시 토큰은 쿠키로 전송되므로 인터셉터 없는 별도 인스턴스 사용 */
const refreshClient = axios.create({
  baseURL: `${env.API_BASE_URL}/api/v1`,
  withCredentials: true,
})

/** 동시 401 발생 시 refresh 요청이 중복되지 않도록 공유 */
let refreshPromise: Promise<string> | null = null

export async function refreshAccessToken(role: AuthRole): Promise<string> {
  refreshPromise ??= refreshClient
    .post<{ data: { accessToken: string } }>('/auth/refresh')
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
