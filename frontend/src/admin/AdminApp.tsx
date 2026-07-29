import { Navigate, Route, Routes } from 'react-router-dom'

import { ToastProvider } from '@/shared/ui'
import { RequireAdminAuth } from '@/admin/features/auth/RequireAdminAuth'
import AdminConsultationPage from '@/admin/pages/AdminConsultationPage'
import AdminLoginPage from '@/admin/pages/AdminLoginPage'
import AdminMainPage from '@/admin/pages/AdminMainPage'

/** admin 앱의 라우트 루트. 진입점은 로그인 화면이다. */
export default function AdminApp() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          index
          element={
            <RequireAdminAuth>
              <AdminMainPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path="consultation/:consultationId"
          element={
            <RequireAdminAuth>
              <AdminConsultationPage />
            </RequireAdminAuth>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </ToastProvider>
  )
}
