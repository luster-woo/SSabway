import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAdminAuth } from '@/admin/features/auth/RequireAdminAuth'
import AdminLoginPage from '@/admin/pages/AdminLoginPage'
import { AdminShell } from '@/admin/ui/AdminShell'

/** admin 앱의 라우트 루트. 진입점은 로그인 화면이다. */
export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route
        index
        element={
          <RequireAdminAuth>
            {/* 로그인 성공 후 착지점. 관리자 메인 화면이 붙으면 교체한다. */}
            <AdminShell>
              <div className="flex flex-1 items-center justify-center">
                <p className="text-ink-muted text-sm font-bold">
                  로그인되었습니다
                </p>
              </div>
            </AdminShell>
          </RequireAdminAuth>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
