/**
 * 설치 유도를 띄울지 판단하는 데 필요한 실행 환경 판정.
 *
 * 두 갈래만 구분하면 된다.
 *   - 이미 설치된 앱으로 실행 중인가  → 유도할 이유가 없다
 *   - iOS 인가                        → 설치 API 가 없어 수동 안내가 필요하다
 */

/**
 * 홈 화면에서 실행된(= 설치된) 상태인지.
 *
 * iOS 사파리는 `display-mode` 미디어 쿼리를 오래 지원하지 않아서
 * 비표준 `navigator.standalone` 도 함께 본다.
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const media = window.matchMedia
  if (typeof media === 'function') {
    // minimal-ui 도 설치된 것으로 본다 (display_override 폴백).
    if (media.call(window, '(display-mode: standalone)').matches) return true
    if (media.call(window, '(display-mode: minimal-ui)').matches) return true
  }

  const legacy = window.navigator as Navigator & { standalone?: boolean }
  return legacy.standalone === true
}

/**
 * iOS 계열 기기인지.
 *
 * 브라우저는 따로 보지 않는다 — iOS 16.4 부터 사파리가 아닌 브라우저에서도
 * 「홈 화면에 추가」가 가능하고, 어느 쪽이든 공유 시트를 거치는 절차는 같다.
 */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false

  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true

  /*
    iPadOS 13+ 는 기본으로 데스크톱 UA 를 쓴다. 터치가 되는 Mac 은 없으므로
    'MacIntel' + 멀티터치 조합으로 아이패드를 걸러낸다.
    (navigator.platform 은 비표준이지만 이 판정에는 아직 대안이 없다)
  */
  const platform = (navigator as Navigator & { platform?: string }).platform
  return platform === 'MacIntel' && navigator.maxTouchPoints > 1
}
