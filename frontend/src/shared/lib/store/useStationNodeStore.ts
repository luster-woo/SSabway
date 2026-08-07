import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * 파일럿(대구역) 기본 지점.
 *
 * ⚠️ 임시값이다. 그렇다고 빈 값으로 보내면 @NotBlank 에 걸려 400 이고, 아무 문자열이나
 *    넣으면 그래프에 없는 id 라 NAV_NODE_NOT_FOUND 다.
 *
 *    그래서 실제 그래프(daegu_navigation.json)에 있는 노드로 폴백을 둔다.
 *      EX0_01  1번 출구 — 역에 막 들어온 사람의 기본 위치. floor 0, 연결 3개
 *      GA0_01  개찰구   — floor 0
 *    둘 다 같은 층이라 계단·엘리베이터 제약에 걸리지 않는다.
 *
 *    ✅ 표지판 인식이 붙으면: setStartPoint 로 인식 결과를 넣고 이 상수와
 *       아래 폴백 로직을 지운다. 그 전까지는 "역 입구에서 출발" 가정으로 동작한다.
 */
export const PILOT_STATION_NODE = {
  /** 대구역 1번 출구 */
  START: 'EX0_01',
  /** 대구역 개찰구 */
  FINAL: 'GA0_01',
} as const

interface StationNodeState {
  /** 표지판 인식이 내놓은 출발 노드 id. null 이면 아직 인식하지 않았다. */
  startPoint: string | null
  /** 표지판 인식이 내놓은 출발 지점의 층(예: "3"). null 이면 아직 인식하지 않았다. */
  startFloor: string | null
  /** 개찰구 노드 id. null 이면 아직 정해지지 않았다. */
  finalPoint: string | null
  setStartPoint: (nodeId: string | null) => void
  setStartFloor: (floor: string | null) => void
  setFinalPoint: (nodeId: string | null) => void
  clearStationNodes: () => void
}

/**
 * 역 내 경로의 출발·도착 노드.
 *
 * 지하철 노선 경로(/routes/path)가 "어느 역에서 어느 역까지"를 정하고,
 * 이 스토어는 "그 역 안에서 어디부터 어디까지"를 정한다. 좌표가 아니라
 * 역 도면 그래프의 노드 id 다.
 *
 * sessionStorage 에 저장한다 — 안내 도중 새로고침되면 출발 지점이 사라져
 * 표지판을 처음부터 다시 찍어야 한다.
 */
export const useStationNodeStore = create<StationNodeState>()(
  persist(
    (set) => ({
      startPoint: null,
      startFloor: null,
      finalPoint: null,
      setStartPoint: (nodeId) => set({ startPoint: nodeId }),
      setStartFloor: (floor) => set({ startFloor: floor }),
      setFinalPoint: (nodeId) => set({ finalPoint: nodeId }),
      clearStationNodes: () =>
        set({ startPoint: null, startFloor: null, finalPoint: null }),
    }),
    {
      name: 'ssabway:station-node',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        startPoint: state.startPoint,
        startFloor: state.startFloor,
        finalPoint: state.finalPoint,
      }),
    },
  ),
)

/**
 * 요청에 실을 출발·도착 노드를 정한다.
 *
 * 인식 결과가 있으면 그것을, 없으면 파일럿 기본값을 쓴다. 요청 조립부에서
 * `?? PILOT_STATION_NODE.START` 를 흩뿌리지 않도록 여기 한 곳에 모은다 —
 * 표지판 인식이 붙어 폴백을 지울 때 고칠 데가 이 함수뿐이어야 한다.
 */
export function resolveStationNodes(state: {
  startPoint: string | null
  finalPoint: string | null
}): { startPoint: string; finalPoint: string } {
  return {
    startPoint: state.startPoint ?? PILOT_STATION_NODE.START,
    finalPoint: state.finalPoint ?? PILOT_STATION_NODE.FINAL,
  }
}
