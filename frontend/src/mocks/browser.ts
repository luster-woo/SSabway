import { setupWorker } from 'msw/browser'

import { handlers } from '@/mocks/handlers'

export const worker = setupWorker(...handlers)

/**
 * 목 서버를 켠다. main.tsx 가 개발 모드에서만 호출한다.
 *
 * onUnhandledRequest: 'bypass' 이므로 handlers 에 없는 요청은
 * 가로채지 않고 실제 서버로 나간다. BE 연동이 끝난 엔드포인트는
 * handlers 에서 지우기만 하면 자연스럽게 실서버로 전환된다.
 */
export function startMockWorker(): Promise<unknown> {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
