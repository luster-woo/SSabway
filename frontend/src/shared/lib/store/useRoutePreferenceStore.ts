import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { RoutePlan, RoutePreference } from '@/shared/types/guide'

interface RoutePreferenceState {
  /** 사용자가 답한 내용. null 이면 아직 안내 정보 화면을 거치지 않았다. */
  answers: RoutePreference | null
  /** 답변으로 확정된 경유 계획. answers 와 항상 짝으로 채워진다. */
  plan: RoutePlan | null
  setPreference: (answers: RoutePreference, plan: RoutePlan) => void
  clearPreference: () => void
}

/**
 * '경로에 필요한 정보' 질문의 답.
 *
 * 안내 정보 확인 화면(5)에서 정해져 경로 상세 안내 화면(6)의 요청 본문이 된다.
 * 두 화면이 형제라 props 로 넘길 수 없어 스토어를 거친다.
 *
 * useRoutePreference(질문 흐름의 지역 상태)와 역할이 다르다 — 그쪽은 "지금 어느
 * 질문에 있는가"를 들고 있고, 여기는 "무엇을 답했는가"만 화면 밖으로 내보낸다.
 * 되돌아가기로 버려진 가지의 답은 여기 오지 않는다.
 *
 * ⚠️ sessionStorage 에 저장한다. 안내 도중 새로고침되면 답이 사라져 경로를 다시
 *    계산할 수 없고, 사용자는 질문에 처음부터 다시 답해야 한다. 역 안에서 앱이
 *    백그라운드로 갔다 돌아오며 리로드되는 일이 잦다.
 */
export const useRoutePreferenceStore = create<RoutePreferenceState>()(
  persist(
    (set) => ({
      answers: null,
      plan: null,
      setPreference: (answers, plan) => set({ answers, plan }),
      clearPreference: () => set({ answers: null, plan: null }),
    }),
    {
      name: 'ssabway:route-preference',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ answers: state.answers, plan: state.plan }),
    },
  ),
)
