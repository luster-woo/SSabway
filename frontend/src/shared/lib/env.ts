export interface AppEnv {
  API_BASE_URL: string
}

declare global {
  interface Window {
    __ENV__?: Partial<AppEnv>
  }
}

const FALLBACK: AppEnv = {
  API_BASE_URL: 'http://localhost:8080',
}

export const env: AppEnv = { ...FALLBACK, ...window.__ENV__ }

if (import.meta.env.DEV && !window.__ENV__) {
  console.warn('[env] config.js가 로드되지 않아 기본값을 사용합니다.')
}
