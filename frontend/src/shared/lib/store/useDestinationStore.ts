import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Place } from '@/shared/types/place'

interface DestinationState {
  /** null이면 아직 목적지를 고르지 않은 상태 */
  destination: Place | null
  setDestination: (place: Place) => void
  clearDestination: () => void
}

/**
 * 사용자가 고른 목적지. 서버가 아니라 사용자의 선택이므로 zustand에 둔다.
 * 목적지 설정 → 경로 선택 → 안내 정보 확인까지 이어지는 화면들이 참조한다.
 *
 * ⚠️ sessionStorage 에 저장한다. 메모리에만 두면 새로고침 한 번에 목적지가
 *    사라져, 안내 정보 확인 화면이 사용자의 선택 대신 목 데이터(명동역)를
 *    보여준다. 출발지 스토어와 같은 이유·같은 방식이다.
 */
export const useDestinationStore = create<DestinationState>()(
  persist(
    (set) => ({
      destination: null,
      setDestination: (place) => set({ destination: place }),
      clearDestination: () => set({ destination: null }),
    }),
    {
      name: 'ssabway:destination',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ destination: state.destination }),
    },
  ),
)
