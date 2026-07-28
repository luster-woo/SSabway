import { create } from 'zustand'

export type AuthRole = 'user' | 'admin'

/** idle: 부팅 직후 복구 시도 전 / authenticated: 토큰 보유 / unauthenticated: 복구 실패 */
export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated'

interface AuthState {
  /** 액세스 토큰. 메모리에만 보관하며 절대 영속화하지 않는다. */
  accessToken: Record<AuthRole, string | null>
  status: Record<AuthRole, AuthStatus>
  setAccessToken: (role: AuthRole, token: string) => void
  clearAccessToken: (role: AuthRole) => void
  setStatus: (role: AuthRole, status: AuthStatus) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: { user: null, admin: null },
  status: { user: 'idle', admin: 'idle' },

  setAccessToken: (role, token) =>
    set((s) => ({
      accessToken: { ...s.accessToken, [role]: token },
      status: { ...s.status, [role]: 'authenticated' },
    })),

  clearAccessToken: (role) =>
    set((s) => ({
      accessToken: { ...s.accessToken, [role]: null },
      status: { ...s.status, [role]: 'unauthenticated' },
    })),

  setStatus: (role, status) =>
    set((s) => ({ status: { ...s.status, [role]: status } })),
}))
