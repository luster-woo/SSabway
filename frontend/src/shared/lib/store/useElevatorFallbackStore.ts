import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface ElevatorFallbackState {
  /**
   * "계단을 포함해 다시 찾기"를 고른 **역 내 도착 노드**. 고른 적이 없으면 null.
   *
   * 불리언 하나로 두면 다음 여정·다른 역까지 계단 경로가 따라간다. 어느 구간에서
   * 고른 선택인지 함께 들고 있다가, 그 구간을 다시 볼 때만 적용한다.
   */
  finalPoint: string | null
  setElevatorFallback: (finalPoint: string) => void
  clearElevatorFallback: () => void
}

/**
 * "엘리베이터로 갈 수 있는 경로가 없어 계단을 포함해 다시 찾았다"는 선택.
 *
 * ## 왜 스토어인가
 *
 * 원래 `RouteGuidePage` 의 지역 state 였다. 그런데 도움 요청 → 화상 상담을
 * 다녀오거나 다른 화면에 들렀다 돌아오면 페이지가 **다시 마운트**되면서 이 값이
 * false 로 돌아갔다. 그러면 요청 본문이 `useElevator: true` 로 되돌아가
 * 서버가 다시 `NAV_NO_STEP_FREE_ROUTE` 를 주고, 사용자는 이미 한 번 통과한
 * "엘리베이터 경로를 찾을 수 없어요" 안내를 처음부터 다시 만난다.
 * (요청 본문이 queryKey 라, 되돌아간 조건은 성공했던 응답의 캐시와도 어긋난다)
 *
 * ## 저장한 답(useRoutePreferenceStore)을 고치지 않는 이유
 *
 * 사용자가 엘리베이터를 원한다는 사실 자체는 바뀌지 않았다 — 이 역의 이 구간에
 * 계단 없는 길이 없을 뿐이다. 답을 덮어쓰면 다른 역에서도 계단을 쓰게 된다.
 *
 * ## 저장소
 *
 * sessionStorage — 다른 여정 스토어와 같다. 새로고침·백그라운드 복귀로 선택이
 * 사라지면 같은 안내를 다시 만나고, 탭을 닫으면 여정 자체가 끝나므로 남을
 * 이유도 없다.
 *
 * ## 비우는 곳
 *
 * - `resetRouteSelection` — 목적지가 바뀔 때. 도착 노드가 달라지므로 어차피
 *   적용되지 않지만 남겨 둘 이유가 없다.
 * - `resetTripSelection` — 새 여정. 위를 그대로 포함한다.
 */
export const useElevatorFallbackStore = create<ElevatorFallbackState>()(
  persist(
    (set) => ({
      finalPoint: null,
      setElevatorFallback: (finalPoint) => set({ finalPoint }),
      clearElevatorFallback: () => set({ finalPoint: null }),
    }),
    {
      name: 'ssabway:elevator-fallback',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ finalPoint: state.finalPoint }),
    },
  ),
)
