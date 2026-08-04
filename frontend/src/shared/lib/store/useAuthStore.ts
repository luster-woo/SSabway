import { create } from 'zustand'

import { clearSessionHint, markSessionHint } from '@/shared/lib/sessionHint'

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

  /*
    토큰을 넣고 빼는 두 곳에서 로그인 흔적(sessionHint)도 같이 관리한다.

    로그인 훅마다 표식을 켜게 하면 언젠가 빠뜨린다 — 일반 로그인·구글 로그인·
    관리자 로그인·재발급이 모두 여기를 지나가고, 로그아웃·탈퇴·권한 불일치
    리다이렉트가 모두 clearAccessToken 을 지나간다. 통로가 좁은 쪽에 붙인다.

    표식이 무엇이고 왜 필요한지는 shared/lib/sessionHint.ts 에 적어 두었다.
  */
  setAccessToken: (role, token) => {
    markSessionHint(role)
    set((s) => ({
      accessToken: { ...s.accessToken, [role]: token },
      status: { ...s.status, [role]: 'authenticated' },
    }))
  },

  clearAccessToken: (role) => {
    clearSessionHint(role)
    set((s) => ({
      accessToken: { ...s.accessToken, [role]: null },
      status: { ...s.status, [role]: 'unauthenticated' },
    }))
  },

  setStatus: (role, status) =>
    set((s) => ({ status: { ...s.status, [role]: status } })),
}))
