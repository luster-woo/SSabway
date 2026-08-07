/**
 * 안내 정보 확인(사용자 정보 입력) 화면에서 쓰는 타입.
 *
 * 역은 사용자가 경로 선택 화면에서 고른 경로가 정하고(`useSelectedRouteStore`),
 * 그 역 안의 지점은 표지판 인식·경로 선택이 담아 둔 노드가 정한다
 * (`useStationNodeStore`). 좌표는 이 화면에 필요하지 않아 담지 않는다 —
 * 좌표가 필요한 쪽(경로 재조회·지도)은 출발지·목적지 스토어를 직접 본다.
 */

/**
 * 안내 정보 확인 화면에 필요한 전체 데이터.
 *
 * 두 값 모두 "역 이름 + 역 도면 노드 코드"를 한 줄로 합친 표기다. 노드 코드는
 * 아직 원문 그대로 보여준다 — 사람이 읽을 이름으로 옮기는 매핑은 나중에 붙인다.
 */
export interface GuideInfo {
  /** 출발 — 표지판으로 인식한 지점. 예: "대구역 S2_03" */
  origin: string
  /** 도착 — 그 역에서 향할 지점(개찰구 등). 예: "대구역 GA0_01" */
  destination: string
}

/**
 * '경로에 필요한 정보'로 묻는 질문들.
 *
 * 개찰 전에 결제수단이 준비됐는지만 확인하는 흐름이다. 카드가 준비돼 있으면
 * PREPARATION·CASH는 묻지 않고 끝나므로, 대다수 사용자는 두 질문만 답한다.
 * 실제 분기는 user/features/user-info/lib/preferenceFlow.ts 가 갖고 있다.
 */
export const PREFERENCE_STEP = {
  /** 엘리베이터 사용 희망 여부. 결제수단과 무관한 고정 첫 질문이다. */
  ELEVATOR: 'ELEVATOR',
  /**
   * 교통카드 소지 + 잔액 충분 여부.
   *
   * 소지와 잔액을 한 질문으로 묶는다. 따로 물으면 "카드는 있는데 잔액이
   * 부족하다"를 표현하려고 두 질문을 거쳐야 하는데, 정작 그 답으로 갈리는
   * 목적지(편의점)는 카드가 아예 없을 때와 같다.
   */
  CARD_READY: 'CARD_READY',
  /** 개찰 전에 무엇을 해결해야 하는지. 경유 목적지가 이 답으로 정해진다. */
  PREPARATION: 'PREPARATION',
  /**
   * 현금 보유 여부.
   *
   * 충전·구매·발권 세 갈래가 모두 현금을 필요로 하므로 갈래마다 묻지 않고
   * 여기 한 번으로 합류시킨다. 답이 '없음'이면 ATM이 경유지 앞에 붙는다.
   */
  CASH: 'CASH',
} as const

export type PreferenceStep =
  (typeof PREFERENCE_STEP)[keyof typeof PREFERENCE_STEP]

/** 질문 순서. 진행 표시(점)의 개수와 위치를 이 배열이 정한다. */
export const PREFERENCE_STEP_ORDER = [
  PREFERENCE_STEP.ELEVATOR,
  PREFERENCE_STEP.CARD_READY,
  PREFERENCE_STEP.PREPARATION,
  PREFERENCE_STEP.CASH,
] as const

/**
 * 개찰 전에 해결해야 할 일. 어느 시설로 갈지를 이 값이 결정한다.
 *
 * CHARGE와 BUY_CARD는 목적지가 같지만(편의점) 거기서 할 일이 달라서
 * 안내 문구가 갈리므로 별개로 둔다.
 */
export const PREPARATION_TASK = {
  /** 카드 있음 · 잔액 부족 → 편의점에서 충전 */
  CHARGE: 'CHARGE',
  /** 카드 없음 → 편의점에서 교통카드 구매 */
  BUY_CARD: 'BUY_CARD',
  /** 카드 없음 → 발매기에서 1회권 발권 */
  SINGLE_TICKET: 'SINGLE_TICKET',
} as const

export type PreparationTask =
  (typeof PREPARATION_TASK)[keyof typeof PREPARATION_TASK]

/** 개찰구로 가기 전에 들러야 하는 시설 */
export const WAYPOINT = {
  /** 충전·교통카드 구매 */
  CONVENIENCE_STORE: 'CONVENIENCE_STORE',
  /** 1회권 발권 */
  TICKET_MACHINE: 'TICKET_MACHINE',
  /** 현금 인출. 항상 다른 경유지보다 먼저 온다. */
  ATM: 'ATM',
} as const

export type Waypoint = (typeof WAYPOINT)[keyof typeof WAYPOINT]

/**
 * 답변으로 확정된 경유 계획. 역 내 경로 계산의 입력값이 된다.
 *
 * 모든 분기가 이 한 형태로 합류하므로, 경로 계산은 갈래를 다시 판단할 필요 없이
 * `waypoints`를 순서대로 이어 붙이면 된다.
 */
export interface RoutePlan {
  /** 개찰 전에 할 일. null이면 바로 탑승한다. */
  task: PreparationTask | null
  /**
   * 방문 순서대로의 경유지. 바로 탑승이면 빈 배열이고,
   * 현금이 없으면 ATM이 맨 앞에 붙는다.
   */
  waypoints: readonly Waypoint[]
}

/** 사용자가 지금까지 답한 내용. 아직 묻지 않은 항목은 null이다. */
export interface RoutePreference {
  useElevator: boolean | null
  /** 교통카드가 있고 잔액도 충분한가 */
  isCardReady: boolean | null
  preparationTask: PreparationTask | null
  hasCash: boolean | null
}
