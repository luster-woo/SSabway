/**
 * 설치 프롬프트 이벤트 보관소.
 *
 * `beforeinstallprompt` 는 manifest 파싱과 서비스 워커 등록이 끝난 뒤에 발생하고,
 * 그 시점은 React 마운트보다 이를 수도 있다. 컴포넌트에서 리스너를 붙이면 이벤트를
 * 놓쳐서 「Install 버튼을 눌러도 아무 일도 안 나는」 상태가 되므로, 모듈 평가 시점에
 * (= main.tsx 가 이 모듈을 import 하는 즉시) 등록한다.
 *
 * ⚠️ 이벤트는 **한 번만** 쓸 수 있고, `prompt()` 는 **사용자 제스처 안**에서
 *    호출해야 한다. 타이머나 effect 안에서 부르면 브라우저가 무시한다.
 *    (설치를 코드로 조용히 진행하는 방법은 어떤 브라우저에도 없다)
 */

/** Chromium 전용 비표준 이벤트. lib.dom 에 타입이 없어 직접 선언한다. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

let deferredEvent: BeforeInstallPromptEvent | null = null
let installed = false

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    /*
      기본 동작(브라우저가 알아서 띄우는 설치 안내)을 막는다.
      표시 시점은 우리가 정한다 — 랜딩 스플래시가 덮고 있는 동안 뒤에서 뜨면
      사용자는 보지도 못한 안내를 놓친다.
    */
    event.preventDefault()
    deferredEvent = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    installed = true
    // 설치가 끝나면 같은 이벤트로 다시 프롬프트할 수 없다.
    deferredEvent = null
    notify()
  })
}

/** useSyncExternalStore 용 구독. */
export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 지금 프롬프트할 수 있는지. (스냅샷이므로 매번 같은 참조를 돌려줘야 한다)
 * null 이면 아직 이벤트가 안 왔거나, 이미 썼거나, 설치 조건을 못 맞춘 브라우저다.
 */
export function getInstallPromptSnapshot(): BeforeInstallPromptEvent | null {
  return deferredEvent
}

export function isAppInstalled(): boolean {
  return installed
}

/**
 * 저장해 둔 이벤트로 브라우저 설치 다이얼로그를 띄운다.
 *
 * **반드시 클릭 핸들러 안에서 직접 호출할 것.** 앞에 `await` 가 끼면 제스처가
 * 끊겨 프롬프트가 조용히 무시된다.
 */
export async function showInstallPrompt(): Promise<InstallOutcome> {
  const event = deferredEvent
  if (event === null) return 'unavailable'

  // 재사용이 불가능하므로 결과와 무관하게 먼저 비운다.
  deferredEvent = null

  try {
    // notify() 보다 먼저 호출해 제스처와 같은 태스크에 머물게 한다.
    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome
  } catch {
    // 이미 소비된 이벤트로 부르면 던진다. 사용자에게는 실패로 알린다.
    return 'unavailable'
  } finally {
    notify()
  }
}
