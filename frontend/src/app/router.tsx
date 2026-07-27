import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

// 이 dynamic import가 manualChunks와 짝을 이룹니다
const AdminApp = lazy(() => import('@/admin/AdminApp'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <div className="p-8 text-2xl">User Home</div>,
  },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<div className="p-8">Loading…</div>}>
        <AdminApp />
      </Suspense>
    ),
  },
])