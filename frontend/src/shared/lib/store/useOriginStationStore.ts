import { create } from 'zustand'

import type { NearestStation } from '@/shared/types/station'

interface OriginStationState {
  /** GPS로 잡은 최근접 출발역(이름+좌표). null이면 아직 못 잡았거나 동의 전이다. */
  originStation: NearestStation | null
  setOriginStation: (station: NearestStation | null) => void
  clearOriginStation: () => void
}

/**
 * 시작 화면에서 GPS 동의 후 조회한 "가까운 역"을 담는다.
 * 목적지 설정 화면이 "내 위치(파란 원)"를 이 역의 좌표에 찍는 데 쓴다.
 */
export const useOriginStationStore = create<OriginStationState>((set) => ({
  originStation: null,
  setOriginStation: (station) => set({ originStation: station }),
  clearOriginStation: () => set({ originStation: null }),
}))
