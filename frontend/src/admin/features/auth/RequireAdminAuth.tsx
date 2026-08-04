import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useRestoreSession } from '@/shared/api/useRestoreSession'
import { RouteLoading } from '@/shared/ui'
import { useAdminProfileStore } from '@/admin/features/auth/useAdminProfileStore'

export interface RequireAdminAuthProps {
  children: ReactNode
}

/**
 * 관리자 인증 가드 (NFR-SEC-004).
 *
 * 액세스 토큰은 메모리에만 두므로 새로고침하면 사라진다. 그래서 부팅 때
 * 리프레시 쿠키로 세션을 한 번 되살린다(useRestoreSession). 이 복구가 없으면
 * 로그인한 관리자가 새로고침만 해도 로그인 화면으로 튕긴다.
 *
 * status 세 값을 구분해서 다뤄야 한다.
 *   'idle'            아직 판정 전이다. "비로그인"이 아니므로 로딩을 보여준다.
 *   'authenticated'   통과
 *   'unauthenticated' 복구 실패(쿠키 없음·만료) → 로그인 화면
 *
 * idle 을 비로그인으로 처리하면 새로고침 직후 로그인 화면이 한 번 스쳤다가
 * 관리자 화면으로 돌아오는 깜빡임이 생긴다.
 *
 * 예전에 이 복구를 막아 두었던 두 가지 전제는 해소됐다.
 *   ① 관리자 로그인이 목이라 리프레시 쿠키가 없던 문제
 *      → useAdminLogin 이 실제로 POST /staffs/login 을 부른다.
 *   ② 사용자 세션으로도 재발급이 통과하던 문제
 *      → refreshAccessToken 이 토큰의 type 클레임을 대조한다
 *        (shared/api/tokenRole.ts). 사용자 토큰이면 여기서 걸러진다.
 */
export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const status = useRestoreSession('admin')
  const clearStaffCode = useAdminProfileStore((s) => s.clearStaffCode)

  /*
    복구 실패로 세션이 끝났으면 사번도 함께 지운다.

    staffCode 는 sessionStorage 에 남으므로(useAdminProfileStore), 지우지 않으면
    쿠키가 만료된 뒤 다시 /admin 에 들어왔을 때 로그인하지 않았는데도 이전
    사용자의 사번이 헤더에 스쳐 보인다. 공용 PC 에서는 그것만으로도 문제다.

    렌더 중이 아니라 이펙트에서 지운다 — 렌더 도중 다른 스토어를 쓰면 React 가
    같은 커밋 안에서 상태를 바꾸는 것이 되어 경고를 낸다.
  */
  useEffect(() => {
    if (status === 'unauthenticated') clearStaffCode()
  }, [status, clearStaffCode])

  if (status === 'idle') {
    return <RouteLoading message="로그인 상태를 확인하는 중입니다" />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
