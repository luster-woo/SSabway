import { useNavigate } from 'react-router-dom'

import { NotFound } from '@/shared/ui'
import { AdminButton } from '@/admin/ui/AdminButton'
import { AdminShell } from '@/admin/ui/AdminShell'

/**
 * 관리자 404 — /admin 아래에 매칭되는 라우트가 없을 때.
 *
 * 사용자 화면과 달리 다국어를 쓰지 않고 한국어로 고정한다. (AdminShell 과 동일 기준)
 * replace 로 이동해 뒤로가기가 다시 404 로 돌아오지 않게 한다.
 */
export default function AdminNotFoundPage() {
  const navigate = useNavigate()

  return (
    <AdminShell>
      <NotFound
        title="페이지를 찾을 수 없습니다"
        description="주소가 잘못되었거나 삭제된 화면입니다."
        action={
          <AdminButton
            size="lg"
            fullWidth
            onClick={() => void navigate('/admin', { replace: true })}
          >
            대기 목록으로
          </AdminButton>
        }
      />
    </AdminShell>
  )
}
