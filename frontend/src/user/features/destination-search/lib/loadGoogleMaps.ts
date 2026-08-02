import { env } from '@/shared/lib/env'

/**
 * Google Maps JS API 로더.
 *
 * 인증 파라미터:
 * - key: Google Cloud Console 에서 발급한 API 키.
 *   Maps JavaScript API + Places API 를 활성화하고 결제 계정이 연결돼 있어야 한다.
 *   프론트에 노출되는 public 값이며, HTTP 리퍼러 제한이 실제 방어선이다.
 * - libraries=places: 목적지(장소) 검색에 PlacesService 를 쓰기 위함.
 * - language: 지도 UI·검색 결과 표기 언어. **스크립트 로드 시점에 고정**된다.
 *   사용자는 시작 화면에서 언어를 고른 뒤 이 화면에 오므로 첫 로드 언어 = 선택 언어다.
 *   (로드 이후 언어를 바꾸면 지도 표기는 새로고침 전까지 이전 언어로 남는다.)
 *
 * index.html 에 넣지 않고 여기서 동적 로드하는 이유: 지도는 목적지 설정 화면에서만
 * 쓰는데 모든 진입 경로에서 매번 외부 스크립트를 받으면 첫 화면 로딩이 그만큼 늦어진다.
 *
 * window.google 은 Google 로그인(GIS)용으로 이미 타입이 잡혀 있어(shared/types/google.d.ts)
 * 여기서는 전역 `google.maps` 네임스페이스를 직접 참조한다.
 */
const SCRIPT_ID = 'google-maps-sdk'
const buildScriptUrl = (apiKey: string, language: string) =>
  `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=${encodeURIComponent(language)}`

/** 여러 컴포넌트가 동시에 요청해도 스크립트는 한 번만 붙도록 프라미스를 캐싱한다. */
let loadPromise: Promise<void> | null = null

export const LOAD_ERROR = {
  /** config.js 에 GOOGLE_MAPS_API_KEY 가 비어 있음 */
  MISSING_KEY: 'MISSING_KEY',
  /** 네트워크 실패 등으로 스크립트 자체를 못 받음 */
  SCRIPT_ERROR: 'SCRIPT_ERROR',
  /** 스크립트는 받았지만 키·리퍼러 인증에서 거부됨 */
  AUTH_FAILED: 'AUTH_FAILED',
} as const
export type LoadErrorType = (typeof LOAD_ERROR)[keyof typeof LOAD_ERROR]

export class GoogleMapsLoadError extends Error {
  readonly reason: LoadErrorType

  constructor(reason: LoadErrorType) {
    super(`google maps sdk load failed: ${reason}`)
    this.name = 'GoogleMapsLoadError'
    this.reason = reason
  }
}

/**
 * 인증 실패 구독.
 *
 * Google SDK 는 인증에 실패해도 스크립트 로드는 성공시키고, 나중에 전역 콜백
 * `gm_authFailure` 만 호출한다. 즉 load 이벤트만 봐서는 "지도가 안 뜨는 이유"를
 * 알 수 없어서 따로 받는다.
 */
type AuthFailureListener = () => void
const authFailureListeners = new Set<AuthFailureListener>()

window.gm_authFailure = () => {
  // 다음 시도에서 스크립트를 다시 받도록 캐시를 비운다.
  loadPromise = null
  authFailureListeners.forEach((listener) => listener())
}

export function onGoogleMapsAuthFailure(listener: AuthFailureListener) {
  authFailureListeners.add(listener)
  return () => {
    authFailureListeners.delete(listener)
  }
}

/** 전역에 google.maps.places 까지 실제로 준비됐는지. (typeof 가드로 런타임 안전) */
function isMapsReady(): boolean {
  return (
    typeof google !== 'undefined' &&
    typeof google.maps !== 'undefined' &&
    typeof google.maps.places !== 'undefined'
  )
}

/**
 * Google Maps SDK 를 동적으로 로드한다.
 *
 * @param language 로드 시점에 고정할 표기 언어(ko/en/ja/zh 등)
 */
export function loadGoogleMaps(language: string): Promise<void> {
  if (isMapsReady()) return Promise.resolve()
  if (loadPromise) return loadPromise

  const apiKey = env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new GoogleMapsLoadError(LOAD_ERROR.MISSING_KEY))
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // 실패한 스크립트를 재사용하면 이미 끝난 태그에 리스너를 다는 셈이라
    // load/error 가 다시 오지 않아 재시도가 영영 멈춘다. 항상 새로 붙인다.
    document.getElementById(SCRIPT_ID)?.remove()

    const script = document.createElement('script')

    const fail = (reason: LoadErrorType) => {
      loadPromise = null
      script.remove()
      reject(new GoogleMapsLoadError(reason))
    }

    script.addEventListener(
      'load',
      () => {
        // libraries=places 를 함께 요청했으므로 load 시점에 places 까지 준비된다.
        if (isMapsReady()) {
          resolve()
          return
        }
        fail(LOAD_ERROR.AUTH_FAILED)
      },
      { once: true },
    )
    script.addEventListener('error', () => fail(LOAD_ERROR.SCRIPT_ERROR), {
      once: true,
    })

    script.id = SCRIPT_ID
    script.async = true
    script.src = buildScriptUrl(apiKey, language)
    document.head.appendChild(script)
  })

  return loadPromise
}
