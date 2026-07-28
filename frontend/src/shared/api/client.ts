import axios, { type AxiosInstance } from 'axios'
import { env } from '@/shared/lib/env'

const TOKEN_KEY = { user: 'user_token', admin: 'admin_token' } as const

type ClientRole = keyof typeof TOKEN_KEY

const LOGIN_PATH: Record<ClientRole, string> = {
  user: '/login',
  admin: '/admin/login',
}

const SESSION_ID_KEY = 'guest_session_id'

/** 비회원 이용자용 임시 세션 ID (기획서 5.6) */
function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, id)
  }
  return id
}

function createClient(role: ClientRole): AxiosInstance {
  const instance = axios.create({
    baseURL: `${env.API_BASE_URL}/api`,
    timeout: 10_000,
  })

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY[role])
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (role === 'user') {
      config.headers['X-Session-Id'] = getOrCreateSessionId()
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY[role])
        // 로그인 페이지에서 401이 나면 무한 리다이렉트가 되므로 방어
        if (window.location.pathname !== LOGIN_PATH[role]) {
          window.location.href = LOGIN_PATH[role]
        }
      }
      return Promise.reject(error)
    },
  )

  return instance
}

export const userApi = createClient('user')
export const adminApi = createClient('admin')

export function setToken(role: ClientRole, token: string) {
  localStorage.setItem(TOKEN_KEY[role], token)
}

export function clearToken(role: ClientRole) {
  localStorage.removeItem(TOKEN_KEY[role])
}
