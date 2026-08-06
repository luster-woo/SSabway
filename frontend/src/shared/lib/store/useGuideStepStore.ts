import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface GuideStepState {
  /** 마지막으로 보고 있던 단계 인덱스 (0부터). 본 적이 없으면 null */
  stepIndex: number | null
  /**
   * 그 단계의 `from` 노드 id.
   *
   * 복원 직전 대조용이다 — 인덱스만 저장하면 경로가 다시 계산됐을 때 같은
   * 번호가 전혀 다른 지점을 가리킨다. 두 값이 맞을 때만 복원한다.
   */
  stepNodeId: string | null
  setGuideStep: (stepIndex: number, stepNodeId: string) => void
  clearGuideStep: () => void
}

/**
 * 경로 상세 안내에서 보고 있던 단계.
 *
 * ## 왜 필요한가
 *
 * `RouteGuidePage` 의 `activeIndex` 는 페이지 지역 state 였다. 그런데 도움 요청 →
 * 화상 상담으로 넘어갔다가 상담이 끝나면 `navigate('/guide', { replace: true })`
 * 로 돌아오면서 페이지가 **다시 마운트**된다. 지역 state 는 그때 0 으로 초기화돼,
 * 상담 전에 세 번째 표지판을 보고 있었어도 첫 번째 표지판으로 되돌아갔다.
 *
 * 화상 상담은 5분을 넘길 수 있어 React Query 캐시(gcTime 기본 5분)도 만료될 수
 * 있다 — 즉 돌아왔을 때 단계 목록 자체가 아직 없을 수 있다. 그래서 복원은
 * "마운트 시점"이 아니라 "단계가 도착한 시점"에 한다(RouteGuidePage 참고).
 *
 * ## 인덱스만으로는 부족하다
 *
 * 표지판을 다시 찍거나 답을 고치면 경로가 새로 계산된다. 그때 옛 인덱스를 그대로
 * 쓰면 엉뚱한 지점을 "현재 위치"로 보여 준다. `stepNodeId` 를 함께 저장해 두고
 * `steps[stepIndex].from` 과 같을 때만 복원해서 이 사고를 막는다.
 *
 * ## 저장소
 *
 * sessionStorage — 다른 여행 스토어들과 같은 이유다. 상담 화면에서 새로고침되거나
 * 앱이 잠깐 백그라운드로 내려가도 진행 상태가 살아 있어야 하고, 탭을 닫으면
 * 여정 자체가 끝나므로 남을 이유도 없다.
 *
 * ## 비우는 곳
 *
 * - `RouteGuidePage.rescanRoute` — 재탐색은 "지금 내가 어디인지 다시 잡는다"라
 *   새 경로의 첫 단계가 곧 현재 위치다.
 * - `resetTripSelection` — 새 여정을 시작할 때.
 */
export const useGuideStepStore = create<GuideStepState>()(
  persist(
    (set) => ({
      stepIndex: null,
      stepNodeId: null,
      setGuideStep: (stepIndex, stepNodeId) => set({ stepIndex, stepNodeId }),
      clearGuideStep: () => set({ stepIndex: null, stepNodeId: null }),
    }),
    {
      name: 'ssabway:guide-step',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        stepIndex: state.stepIndex,
        stepNodeId: state.stepNodeId,
      }),
    },
  ),
)
