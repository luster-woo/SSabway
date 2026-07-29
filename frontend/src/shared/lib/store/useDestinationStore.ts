import { create } from 'zustand'

import type { Place } from '@/shared/types/place'

interface DestinationState {
  /** null이면 아직 목적지를 고르지 않은 상태 */
  destination: Place | null
  setDestination: (place: Place) => void
  clearDestination: () => void
}

/**
 * 사용자가 고른 목적지. 서버가 아니라 사용자의 선택이므로 zustand에 둔다.
 * 목적지 설정 → 사용자 정보 입력 → 경로 선택까지 이어지는 화면들이 참조한다.
 */
export const useDestinationStore = create<DestinationState>((set) => ({
  destination: null,
  setDestination: (place) => set({ destination: place }),
  clearDestination: () => set({ destination: null }),
}))
