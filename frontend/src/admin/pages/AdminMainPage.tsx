import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useAdminProfileStore } from '@/admin/features/auth/useAdminProfileStore'
import { WaitingPanel } from '@/admin/features/consultation-receive/WaitingPanel'
import { HistoryPanel } from '@/admin/features/dashboard/HistoryPanel'
import { AdminButton } from '@/admin/ui/AdminButton'
import { AdminShell } from '@/admin/ui/AdminShell'

/**
 * 관리자 2. 메인 — /admin
 *
 * 상담 대기와 민원 기록을 한 화면에서 나란히 본다.
 * 두 목록이 각각 길어지므로 화면 높이를 채우고 패널 안에서만 스크롤한다.
 */
export default function AdminMainPage() {
  const navigate = useNavigate()
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken)
  const staffCode = useAdminProfileStore((s) => s.staffCode)
  const clearStaffCode = useAdminProfileStore((s) => s.clearStaffCode)

  const signOut = () => {
    clearAccessToken('admin')
    clearStaffCode()
    void navigate('/admin/login', { replace: true })
  }

  return (
    <AdminShell
      headerRight={
        <div className="flex items-center gap-4">
          <AdminButton
            variant="onDark"
            size="sm"
            className="rounded-full"
            onClick={signOut}
          >
            로그아웃
          </AdminButton>

          {staffCode ? (
            <span className="text-[13px] text-white/80">{staffCode}</span>
          ) : null}
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,4fr)_minmax(0,5fr)] gap-6 p-6">
        <WaitingPanel />
        <HistoryPanel />
      </div>
    </AdminShell>
  )
}
