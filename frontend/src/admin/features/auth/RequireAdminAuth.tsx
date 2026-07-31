import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'

export interface RequireAdminAuthProps {
  children: ReactNode
}

/**
 * 관리자 인증 가드 (NFR-SEC-004).
 *
 * 미인증이면 로그인 화면으로 돌려보낸다. 지금은 idle 도 미인증으로 처리하므로
 * 새로고침하면 로그인 화면으로 돌아간다. (의도된 임시 동작)
 *
 * TODO: user 쪽처럼 useRestoreSession('admin') 을 붙이고, status 가 'idle' 인
 *       동안은 판단을 보류하고 <RouteLoading /> 을 보여줘야 한다.
 *       단, 먼저 아래 두 가지가 해결돼야 한다. 지금 붙이면 오히려 위험하다.
 *
 *       ① 관리자 로그인이 아직 useAdminLogin 안의 목이라 HTTP 요청이 나가지
 *          않는다. 서버가 관리자용 리프레시 쿠키를 심지 않으므로 복구가 항상
 *          실패하고, 로딩만 한 번 더 보여주고 로그인 화면으로 가게 된다.
 *       ② MSW 의 /auth/refresh 목은 쿠키 존재 여부만 본다. (handlers.ts)
 *          그래서 사용자로 로그인한 브라우저에서 /admin 에 들어가면 재발급이
 *          200 을 돌려주고 관리자로 인증된 것처럼 통과한다. 목을 role 까지
 *          구분하도록 고친 뒤에 붙일 것.
 */
export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const isAuthenticated = useAuthStore(
    (s) => s.status.admin === 'authenticated',
  )

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
