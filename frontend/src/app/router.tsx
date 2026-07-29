import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import UserApp from '@/user/UserApp'

// user 앱은 메인 청크에 포함시켜야 PWA 오프라인 진입이 보장된다.
// admin·agent만 lazy로 분리한다. (vite.config.ts manualChunks와 짝을 맞춘다)
const AdminApp = lazy(() => import('@/admin/AdminApp'))
const AgentApp = lazy(() => import('@/agent/AgentApp'))

export const router = createBrowserRouter([
  {
    path: '/*',
    element: <UserApp />,
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
    path: '/agent/*',
    element: (
      <Suspense fallback={null}>
        <AgentApp />
      </Suspense>
    ),
  },
])
