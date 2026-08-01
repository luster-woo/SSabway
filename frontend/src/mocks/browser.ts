import { setupWorker } from 'msw/browser'

import { handlers } from '@/mocks/handlers'

export const worker = setupWorker(...handlers)

/**
 * 목 서버를 켠다. main.tsx 가 개발 모드에서만 호출한다.
 *
 * onUnhandledRequest: 'bypass' 이므로 handlers 에 없는 요청은
 * 가로채지 않고 실제 서버로 나간다. 특정 엔드포인트만 실서버로
 * 보내려면 핸들러를 지우지 말고 mockSwitch.ts 에서 끈다 —
 * 실서버 오류 시 스위치만 되돌리면 즉시 목으로 복귀한다.
 */
export function startMockWorker(): Promise<unknown> {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
