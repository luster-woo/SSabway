// 라우터 설정 파일이라 컴포넌트만 export할 수 없다. lazy() 결과를 컴포넌트로
// 인식하지 못하는 오탐이며, 영향은 이 파일 저장 시 HMR이 전체 리로드되는 것뿐이다.
// 청크 분리(vite.config.ts manualChunks)와 짝을 이루므로 파일을 쪼개지 않는다.
// oxlint-disable react/only-export-components
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import UserApp from '@/user/UserApp'

// user 앱은 메인 청크에 포함시켜야 PWA 오프라인 진입이 보장된다.
// admin만 lazy로 분리한다. (vite.config.ts manualChunks와 짝을 맞춘다)
const AdminApp = lazy(() => import('@/admin/AdminApp'))

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
])
