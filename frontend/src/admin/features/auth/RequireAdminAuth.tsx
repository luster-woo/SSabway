import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'

export interface RequireAdminAuthProps {
  children: ReactNode
}

/**
 * 관리자 인증 가드 (NFR-SEC-004).
 *
 * 미인증이면 로그인 화면으로 돌려보낸다.
 * TODO: restoreSession('admin') 을 붙이면 status 가 'idle' 인 동안은
 *       판단을 보류하고 로딩을 보여줘야 한다. 지금은 idle 도 미인증으로 처리한다.
 */
export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const isAuthenticated = useAuthStore(
    (s) => s.status.admin === 'authenticated',
  )

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
