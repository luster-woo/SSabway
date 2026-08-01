export interface AppEnv {
  API_BASE_URL: string
  /**
   * 네이버 클라우드 플랫폼 Maps의 Client ID.
   * Client Secret은 서버 전용이므로 여기에 넣지 않는다.
   * 콘솔의 Web 서비스 URL에 접속 도메인이 등록돼 있어야 지도가 뜬다.
   *
   * 🔁 S15P11D104-322 에서 목적지 지도를 구글로 교체했다. 네이버 지도 코드는
   *    롤백용으로 남겨 두었으므로 이 키도 함께 보존한다.
   */
  NAVER_MAP_CLIENT_ID: string
  /**
   * Google Maps Platform API 키 (Maps JavaScript API + Places API).
   *
   * 프론트에 노출되는 public 값이다. 실제 방어선은 Google Cloud Console 의
   * "HTTP 리퍼러 제한"이므로, 허용 리퍼러에 접속 도메인(로컬은
   * http://localhost:5173/*)이 등록돼 있어야 지도가 뜬다.
   * 키가 비어 있으면 목적지 화면이 MISSING_KEY 안내로 뜬다.
   */
  GOOGLE_MAPS_API_KEY: string
  /**
   * Google Identity Services 의 OAuth 클라이언트 ID.
   *
   * 프론트에 노출되는 것이 정상인 public 값이다. Client Secret 과 달리
   * 이 값만으로는 아무것도 못 하며, Google Cloud Console 의
   * "승인된 자바스크립트 원본" 화이트리스트가 실제 방어선이다.
   * 등록되지 않은 오리진에서 호출하면 origin_mismatch 로 막힌다.
   */
  GOOGLE_CLIENT_ID: string
  /**
   * MSW 목 서버 사용 여부. 개발 모드에서만 의미가 있다.
   *
   * BE가 준비되지 않은 API를 프론트 단독으로 확인할 때 true.
   * 실제 서버로 붙여볼 때나 PWA 동작을 확인할 때(devOptions.enabled = true)는
   * 서비스 워커가 겹치지 않도록 false 로 둔다.
   */
  USE_MSW: boolean
}

declare global {
  interface Window {
    __ENV__?: Partial<AppEnv>
  }
}

const FALLBACK: AppEnv = {
  // 빈 문자열 = 상대 경로. dev 는 vite proxy, 배포는 nginx 가 백엔드로 넘긴다.
  // 절대 주소를 기본값으로 두면 config.js 로드가 실패했을 때 조용히
  // 엉뚱한 오리진으로 요청이 나가므로 여기서도 상대 경로를 기본으로 한다.
  API_BASE_URL: '',
  NAVER_MAP_CLIENT_ID: '',
  GOOGLE_MAPS_API_KEY: '',
  GOOGLE_CLIENT_ID: '',
  USE_MSW: false,
}

export const env: AppEnv = { ...FALLBACK, ...window.__ENV__ }

/**
 * 개발 모드 여부.
 * `import.meta.env`는 빌드 시점에 치환되므로 앱 코드에서 직접 쓰지 않고
 * 여기서 한 번만 읽어 내보낸다.
 */
export const IS_DEV: boolean = import.meta.env.DEV

if (import.meta.env.DEV && !window.__ENV__) {
  console.warn('[env] config.js가 로드되지 않아 기본값을 사용합니다.')
}
