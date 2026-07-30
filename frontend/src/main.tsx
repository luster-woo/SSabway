import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import '@/shared/lib/i18n'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { env, IS_DEV } from '@/shared/lib/env'
import './index.css'

registerSW({ immediate: true })

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

/**
 * 목 서버를 켜야 하면 워커가 준비된 뒤에 렌더한다.
 * 먼저 렌더하면 화면 진입 직후 나가는 요청이 목을 놓칠 수 있다.
 *
 * 동적 import 라서 운영 빌드에는 msw 코드가 포함되지 않는다.
 */
if (IS_DEV && env.USE_MSW) {
  void import('@/mocks/browser')
    .then(({ startMockWorker }) => startMockWorker())
    .finally(renderApp)
} else {
  renderApp()
}
