const GIS_SRC = 'https://accounts.google.com/gsi/client'

/**
 * 로드 Promise 를 모듈 수준에 캐싱한다.
 *
 * 버튼 컴포넌트가 StrictMode 로 두 번 마운트되거나 화면을 오갈 때마다
 * 스크립트를 다시 붙이면 안 된다. 실패했을 때는 null 로 되돌려
 * 다음 시도에서 다시 받을 수 있게 한다.
 */
let loadPromise: Promise<void> | null = null

/**
 * Google Identity Services 스크립트를 불러온다.
 *
 * 외부 CDN 의존이므로 오프라인에서는 실패한다. 로그인 자체가 온라인 기능이라
 * 실질 문제는 없지만, 호출부에서 실패를 잡아 안내 문구를 띄워야 한다.
 * (PWA 라 오프라인 진입이 가능하다)
 */
export function loadGoogleIdentity(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    // 다른 곳에서 이미 붙였다면(HMR 등) 그것을 재사용한다.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    )
    if (existing) {
      if (window.google) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Google Identity Services 로드 실패')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => {
        loadPromise = null
        reject(new Error('Google Identity Services 로드 실패'))
      },
      { once: true },
    )
    document.head.appendChild(script)
  })

  return loadPromise
}
