import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { requestLogout } from '@/shared/api/client'
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
  const staffCode = useAdminProfileStore((s) => s.staffCode)
  const clearStaffCode = useAdminProfileStore((s) => s.clearStaffCode)

  /*
    블랙리스트 명단은 민원 기록이 아니라 역무원 계정 단위의 목록이라 헤더에 둔다.
    여는 버튼만 여기 있고 모달 본체·등록·해제는 HistoryPanel 이 그대로 갖고 있어
    (사유 수정 모달과 상태를 공유해야 한다) 열림 여부만 이 위로 올렸다.
  */
  const [isRosterOpen, setIsRosterOpen] = useState(false)

  /**
   * 로그아웃.
   *
   * requestLogout 이 POST /auth/logout 으로 서버의 리프레시 토큰(Redis)을
   * 무효화하고 브라우저 쿠키를 만료시킨 뒤 로컬 액세스 토큰까지 지운다.
   * 요청이 실패해도 로컬 정리는 보장된다(shared/api/client.ts 참고).
   *
   * ⚠️ 로컬 토큰만 지우면 안 된다. refreshToken 쿠키는 httpOnly 라 JS 로
   *    못 지우고 유효기간이 14일이다. 역무실 공용 PC 에서 로그아웃한 뒤
   *    다음 사용자가 POST /auth/refresh 한 번만 보내면 STAFF 액세스 토큰이
   *    그대로 재발급되어 민원 기록·녹취·블랙리스트에 접근할 수 있다.
   *
   * staffCode 는 관리자 전용이라 shared 가 지울 수 없으므로 여기서 지운다.
   * 서버 응답을 기다렸다가 이동해야 화면 전환 중 요청이 취소되지 않는다.
   */
  const signOut = async () => {
    await requestLogout('admin')
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
            onClick={() => setIsRosterOpen(true)}
          >
            블랙리스트 명단
          </AdminButton>

          <AdminButton
            variant="onDark"
            size="sm"
            className="rounded-full"
            onClick={() => void signOut()}
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
        <HistoryPanel
          isRosterOpen={isRosterOpen}
          onRosterOpenChange={setIsRosterOpen}
        />
      </div>
    </AdminShell>
  )
}
