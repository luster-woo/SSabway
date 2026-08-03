import { setupWorker } from 'msw/browser'

import { seedMockBlacklist } from '@/mocks/blacklistStore'
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
  // 블랙리스트 명단이 비어 있으면 모달에서 해제·페이지네이션을 눌러 볼 수
  // 없어서 초기 1건을 심는다. (이미 데이터가 있으면 건드리지 않는다)
  seedMockBlacklist()

  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
