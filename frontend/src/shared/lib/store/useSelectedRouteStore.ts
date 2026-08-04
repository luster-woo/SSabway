import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { RoutePath, SelectedRoute } from '@/shared/types/route'

interface SelectedRouteState {
  /** 사용자가 경로 선택 화면에서 확정한 경로. null 이면 아직 고르지 않았다. */
  selectedRoute: SelectedRoute | null
  setSelectedRoute: (path: RoutePath) => void
  clearSelectedRoute: () => void
}

/**
 * 경로 응답 한 건에서 이후 화면들이 쓰는 값만 뽑는다.
 *
 * `segments` 는 담지 않는다. 노선·환승 상세는 경로 선택 화면의 카드에서만
 * 쓰이고, 다음 화면들이 필요한 것은 "어느 역에서 어느 역까지 · 몇 분"뿐이다.
 */
export function toSelectedRoute(path: RoutePath): SelectedRoute {
  return {
    departureStation: path.firstStartStation,
    arrivalStation: path.lastEndStation,
    totalTime: path.totalTime,
    transferCount: path.transferCount,
  }
}

/**
 * 사용자가 고른 지하철 경로.
 *
 * ⚠️ 왜 출발지·목적지 스토어를 덮어쓰지 않고 따로 두는가.
 *
 * `useOriginStationStore`·`useDestinationStore` 는 **좌표와 사용자가 고른 실제
 * 장소**를 들고 있다(예: "경북대 북문" + 위경도). 경로 재조회(startX/Y·endX/Y)와
 * 목적지 지도의 "내 위치"가 그 값을 본다. 여기에 역 이름을 덮어쓰면 이름과
 * 좌표가 어긋나고, 최종 목적지가 "수성알파시티역"으로 바뀌어 사용자가 무엇을
 * 향해 가는지 화면에서 사라진다.
 *
 * 그래서 "지하철로 어디서 어디까지 가는지"는 이 스토어가 따로 들고 간다.
 * ODsay 응답의 역 이름이라 `stations.name_ko` 표기와 맞을 가능성이 높고,
 * 상담 요청(`POST /consultations`)의 departure·destination 이 이 값을 쓴다.
 *
 * sessionStorage 에 저장한다 — 안내 도중 새로고침되면 출발·도착 표시가 비고,
 * 상담 요청이 "경로 정보 없음"으로 막힌다. 다른 여행 스토어들과 같은 이유다.
 */
export const useSelectedRouteStore = create<SelectedRouteState>()(
  persist(
    (set) => ({
      selectedRoute: null,
      setSelectedRoute: (path) => set({ selectedRoute: toSelectedRoute(path) }),
      clearSelectedRoute: () => set({ selectedRoute: null }),
    }),
    {
      name: 'ssabway:selected-route',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ selectedRoute: state.selectedRoute }),
    },
  ),
)
