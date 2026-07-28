import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import './index.css'

// Agent 페이지(헤드리스 브라우저)에서는 SW가 캐시된 구버전을 서빙해 디버깅을 방해함
if (!location.pathname.startsWith('/agent')) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
