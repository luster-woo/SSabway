import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { NearestStation } from '@/shared/types/station'

/** 출발지를 무엇으로 잡았는지. 화면 문구가 이 값으로 갈린다. */
export const ORIGIN_SOURCE = {
  /** 표지판 촬영으로 인식한 역 (기본 경로) */
  SIGN: 'SIGN',
  /** 사용자가 지도에서 직접 고름 */
  MANUAL: 'MANUAL',
} as const

export type OriginSource = (typeof ORIGIN_SOURCE)[keyof typeof ORIGIN_SOURCE]

interface OriginStationState {
  /** 출발지(이름+좌표). null 이면 아직 정해지지 않았다. */
  originStation: NearestStation | null
  /** originStation 이 어떻게 정해졌는지. originStation 이 null 이면 null. */
  originSource: OriginSource | null
  setOriginStation: (
    station: NearestStation | null,
    source?: OriginSource,
  ) => void
  clearOriginStation: () => void
}

/**
 * 경로 조회의 출발지.
 *
 * 두 경로로 채워진다.
 *   ① 표지판 촬영으로 인식한 역                        → source: SIGN
 *   ② 목적지 화면 지도에서 사용자가 직접 고른 장소     → source: MANUAL
 *
 * 나중에 정해진 값이 이긴다 — 사용자가 지도에서 직접 골랐다면 표지판 추정보다
 * 그 선택이 우선이다. 목적지 지도의 "내 위치(파란 원)"와 경로 조회의 startX/Y가
 * 모두 이 값을 본다.
 *
 * ⚠️ sessionStorage 에 저장한다. 메모리에만 두면 새로고침 한 번에 출발지가
 *    사라져, 경로 화면이 "출발지를 선택해 주세요"로 되돌아가고 안내 정보
 *    화면은 목 데이터를 보여준다. 지하철 안에서 앱이 백그라운드로 갔다
 *    돌아오며 리로드되는 일이 잦아 실제로 자주 겪는다.
 *
 *    localStorage 가 아니라 sessionStorage 인 이유: 여행 한 번이 끝나면
 *    유효하지 않은 값이다. 며칠 뒤 다시 열었을 때 지난번 출발지가 남아 있으면
 *    사용자는 자기가 고른 적 없는 경로를 보게 된다.
 */
export const useOriginStationStore = create<OriginStationState>()(
  persist(
    (set) => ({
      originStation: null,
      originSource: null,
      setOriginStation: (station, source = ORIGIN_SOURCE.SIGN) =>
        set({
          originStation: station,
          originSource: station ? source : null,
        }),
      clearOriginStation: () =>
        set({ originStation: null, originSource: null }),
    }),
    {
      name: 'ssabway:origin',
      storage: createJSONStorage(() => sessionStorage),
      // 함수(setter)는 저장할 필요가 없다. 값만 남긴다.
      partialize: (state) => ({
        originStation: state.originStation,
        originSource: state.originSource,
      }),
    },
  ),
)
