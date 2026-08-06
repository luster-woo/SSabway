import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CurrentNodeState {
  /**
   * 사용자가 경로 상세 안내에서 **지금 보고 있는 단계의 `from` 노드 id**.
   * null 이면 아직 상세 안내를 열어 본 적이 없다.
   */
  currentNodeId: string | null
  setCurrentNodeId: (nodeId: string) => void
  clearCurrentNode: () => void
}

/**
 * 사용자의 역 내 현재 위치 노드.
 *
 * 위치의 근거는 GPS 가 아니라 "마지막으로 확인한 안내 단계"다 — 사용자가
 * [이전]·[다음] 으로 보는 이미지를 바꾸면 그 단계의 `from` 이 곧 현재 위치가 된다.
 * RouteGuidePage 가 보고 있는 단계가 바뀔 때마다 여기에 갱신한다.
 *
 * 어느 단계를 보고 있었는지(인덱스) 자체는 useGuideStepStore 가 따로 들고 있다 —
 * 이쪽은 상담 요청 본문에 실을 값이고, 그쪽은 화면 복원용이라 수명이 다르다.
 *
 * 쓰는 곳은 상담 요청 하나다 — `POST /consultations` 의 `currentNodeId`
 * (8/5 명세 추가). 역무원이 이 값으로 사용자 위치를 지도에서 본다
 * (`GET /staffs/consultations/{id}/location`).
 *
 * sessionStorage 에 저장한다 — 상세 안내에서 도움 요청 화면으로 넘어간 뒤
 * 새로고침되면 위치가 사라져, 상담 요청이 폴백(출발 노드)으로 흐려진다.
 * 다른 여행 스토어들과 같은 이유다.
 */
export const useCurrentNodeStore = create<CurrentNodeState>()(
  persist(
    (set) => ({
      currentNodeId: null,
      setCurrentNodeId: (nodeId) => set({ currentNodeId: nodeId }),
      clearCurrentNode: () => set({ currentNodeId: null }),
    }),
    {
      name: 'ssabway:current-node',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ currentNodeId: state.currentNodeId }),
    },
  ),
)
