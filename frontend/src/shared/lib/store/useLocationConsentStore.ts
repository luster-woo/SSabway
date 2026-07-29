import { create } from 'zustand'

export const LOCATION_CONSENT = {
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
} as const

export type LocationConsent =
  (typeof LOCATION_CONSENT)[keyof typeof LOCATION_CONSENT]

interface LocationConsentState {
  /** null이면 아직 선택하지 않은 상태 */
  consent: LocationConsent | null
  setConsent: (value: LocationConsent) => void
  resetConsent: () => void
}

/**
 * 위치 정보 접근 동의 여부. 서버 데이터가 아닌 클라이언트 전용 상태다.
 * 시작 페이지에서 선택하고 이후 길안내 플로우 전반에서 참조한다.
 */
export const useLocationConsentStore = create<LocationConsentState>((set) => ({
  consent: null,
  setConsent: (value) => set({ consent: value }),
  resetConsent: () => set({ consent: null }),
}))
