import { env } from '@/shared/lib/env'

/**
 * 네이버 지도 v3 스크립트 URL.
 *
 * 인증 파라미터 주의:
 * 콘솔 라벨은 "Client ID"지만 2025년 이후 발급분은 `ncpKeyId`로 넘겨야 한다.
 * 그 이전에 만든 애플리케이션만 `ncpClientId`가 동작한다.
 * 인증 실패(Error Code 200)가 뜨는데 웹 서비스 URL이 맞다면 이 값을 먼저 의심할 것.
 *
 * Client Secret은 서버 전용이므로 절대 여기 넣지 않는다.
 * geocoder 서브모듈이 있어야 naver.maps.Service.geocode를 호출할 수 있다.
 */
const AUTH_PARAM = 'ncpKeyId'
const SCRIPT_ID = 'naver-maps-sdk'
const buildScriptUrl = (clientId: string) =>
  `https://oapi.map.naver.com/openapi/v3/maps.js?${AUTH_PARAM}=${encodeURIComponent(clientId)}&submodules=geocoder`

/** 여러 컴포넌트가 동시에 요청해도 스크립트는 한 번만 붙도록 프라미스를 캐싱한다. */
let loadPromise: Promise<typeof naver> | null = null

export const LOAD_ERROR = {
  /** config.js에 NAVER_MAP_CLIENT_ID가 비어 있음 */
  MISSING_KEY: 'MISSING_KEY',
  /** 네트워크 실패 등으로 스크립트 자체를 못 받음 */
  SCRIPT_ERROR: 'SCRIPT_ERROR',
  /** 스크립트는 받았지만 키·도메인 인증에서 거부됨 */
  AUTH_FAILED: 'AUTH_FAILED',
} as const
export type LoadErrorType = (typeof LOAD_ERROR)[keyof typeof LOAD_ERROR]

export class NaverMapsLoadError extends Error {
  readonly reason: LoadErrorType

  constructor(reason: LoadErrorType) {
    super(`naver maps sdk load failed: ${reason}`)
    this.name = 'NaverMapsLoadError'
    this.reason = reason
  }
}

/**
 * 인증 실패 구독.
 *
 * 네이버 SDK는 인증에 실패해도 스크립트 로드는 성공시키고,
 * 나중에 전역 콜백 `navermap_authFailure`만 호출한다.
 * 즉 load 이벤트만 봐서는 "지도가 안 뜨는 이유"를 알 수 없어서 따로 받는다.
 */
type AuthFailureListener = () => void
const authFailureListeners = new Set<AuthFailureListener>()

window.navermap_authFailure = () => {
  // 다음 시도에서 스크립트를 다시 받도록 캐시를 비운다.
  loadPromise = null
  authFailureListeners.forEach((listener) => listener())
}

export function onNaverMapsAuthFailure(listener: AuthFailureListener) {
  authFailureListeners.add(listener)
  return () => {
    authFailureListeners.delete(listener)
  }
}

/**
 * 네이버 지도 SDK를 동적으로 로드한다.
 *
 * index.html에 넣지 않고 여기서 불러오는 이유:
 * 지도는 목적지 설정 화면에서만 쓰는데, 모든 진입 경로에서 매번
 * 외부 스크립트를 받으면 첫 화면 로딩이 그만큼 늦어진다.
 */
export function loadNaverMaps(): Promise<typeof naver> {
  if (window.naver?.maps) return Promise.resolve(window.naver)
  if (loadPromise) return loadPromise

  const clientId = env.NAVER_MAP_CLIENT_ID
  if (!clientId) {
    return Promise.reject(new NaverMapsLoadError(LOAD_ERROR.MISSING_KEY))
  }

  loadPromise = new Promise<typeof naver>((resolve, reject) => {
    // 실패한 스크립트를 재사용하면 이미 끝난 태그에 리스너를 다는 셈이라
    // load/error가 다시 오지 않아 재시도가 영영 멈춘다. 항상 새로 붙인다.
    document.getElementById(SCRIPT_ID)?.remove()

    const script = document.createElement('script')

    const fail = (reason: LoadErrorType) => {
      loadPromise = null
      script.remove()
      reject(new NaverMapsLoadError(reason))
    }

    script.addEventListener(
      'load',
      () => {
        if (window.naver?.maps) {
          resolve(window.naver)
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
    script.src = buildScriptUrl(clientId)
    document.head.appendChild(script)
  })

  return loadPromise
}
