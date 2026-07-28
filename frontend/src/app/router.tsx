import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

const AdminApp = lazy(() => import('@/admin/AdminApp'))
const AgentApp = lazy(() => import('@/agent/AgentApp'))

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
  {
    path: '/agent',
    element: (
      <Suspense fallback={null}>
        <AgentApp />
      </Suspense>
    ),
  },
])
