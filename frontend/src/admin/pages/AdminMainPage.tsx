import { AdminShell } from '@/admin/ui/AdminShell'

/**
 * 관리자 2. 메인 — /admin
 *
 * 아직 화면이 없는 자리. 라우트와 화면을 1:1로 유지해
 * 로그인 후 이동과 뒤로가기 동작이 어긋나지 않도록 한다.
 */
export default function AdminMainPage() {
  return (
    <AdminShell>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-ink-muted text-sm font-bold">
          관리자 메인 페이지 준비 중
        </p>
      </div>
    </AdminShell>
  )
}
