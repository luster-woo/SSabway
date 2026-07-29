export interface AppEnv {
  API_BASE_URL: string
  /**
   * 네이버 클라우드 플랫폼 Maps의 Client ID.
   * Client Secret은 서버 전용이므로 여기에 넣지 않는다.
   * 콘솔의 Web 서비스 URL에 접속 도메인이 등록돼 있어야 지도가 뜬다.
   */
  NAVER_MAP_CLIENT_ID: string
}

declare global {
  interface Window {
    __ENV__?: Partial<AppEnv>
  }
}

const FALLBACK: AppEnv = {
  API_BASE_URL: 'http://localhost:8080',
  NAVER_MAP_CLIENT_ID: '',
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
