/**
 * 안내 정보 확인(사용자 정보 입력) 화면에서 쓰는 타입.
 *
 * 출발지는 표지판 인식(POST /routes/sign) 결과, 도착지는 사용자가 고른 목적지에서
 * 정해진다. 두 값 모두 최종적으로는 BE가 내려주므로 한 덩어리로 묶어 둔다.
 */

/** 안내 구간의 한쪽 끝(출발 또는 도착) */
export interface GuideEndpoint {
  /** 화면에 크게 보여줄 이름 ("홍대입구역 3번 출구") */
  name: string
  /** 이름 위에 붙는 보조 설명 ("표지판 인식 결과") */
  detail: string
  /** 역 이름 ("홍대입구역"). 노선 뱃지·경로 조회에 쓴다. */
  stationName: string
  latitude: number
  longitude: number
}

/** 출발지 정보를 무엇으로 잡았는지 */
export const ORIGIN_SOURCE = {
  /** 표지판 촬영 → AI 인식 */
  SIGN: 'SIGN',
  /** GPS 기반 최근접 역 */
  GPS: 'GPS',
  /** 사용자가 직접 선택 */
  MANUAL: 'MANUAL',
} as const

export type OriginSource = (typeof ORIGIN_SOURCE)[keyof typeof ORIGIN_SOURCE]

/** 안내 정보 확인 화면에 필요한 전체 데이터 */
export interface GuideInfo {
  origin: GuideEndpoint
  destination: GuideEndpoint
  originSource: OriginSource
}

/**
 * '경로에 필요한 정보'로 묻는 질문들.
 *
 * 교통카드가 있으면 TICKET_METHOD·CASH는 묻지 않는 등 답에 따라 건너뛴다.
 * 실제 분기는 user/features/user-info/lib/preferenceFlow.ts 가 갖고 있다.
 */
export const PREFERENCE_STEP = {
  /** 엘리베이터 사용 희망 여부 */
  ELEVATOR: 'ELEVATOR',
  /** 교통카드 소지 여부 */
  TRANSIT_CARD: 'TRANSIT_CARD',
  /** 교통카드가 없을 때 어떤 방식으로 탈지 */
  TICKET_METHOD: 'TICKET_METHOD',
  /** 교통카드를 사려 할 때 현금 보유 여부 */
  CASH: 'CASH',
} as const

export type PreferenceStep =
  (typeof PREFERENCE_STEP)[keyof typeof PREFERENCE_STEP]

/** 질문 순서. 진행 표시(점)의 개수와 위치를 이 배열이 정한다. */
export const PREFERENCE_STEP_ORDER = [
  PREFERENCE_STEP.ELEVATOR,
  PREFERENCE_STEP.TRANSIT_CARD,
  PREFERENCE_STEP.TICKET_METHOD,
  PREFERENCE_STEP.CASH,
] as const

/** 교통카드가 없을 때 고르는 탑승 방식 */
export const TICKET_METHOD = {
  /** 1회권 구매 · 현금으로 이동 */
  SINGLE: 'SINGLE',
  /** 교통카드를 구매 */
  BUY_CARD: 'BUY_CARD',
} as const

export type TicketMethod = (typeof TICKET_METHOD)[keyof typeof TICKET_METHOD]

/** 답변에 따라 확정되는 경유 계획. 역 내 경로 계산의 입력값이 된다. */
export const ROUTE_PLAN = {
  /** 바로 개찰구로 */
  DIRECT: 'DIRECT',
  /** 승차권 발매기 경유 */
  TICKET_MACHINE: 'TICKET_MACHINE',
  /** 편의점 경유 (교통카드 구매) */
  CONVENIENCE_STORE: 'CONVENIENCE_STORE',
  /** ATM 경유 (현금 인출) */
  ATM: 'ATM',
} as const

export type RoutePlan = (typeof ROUTE_PLAN)[keyof typeof ROUTE_PLAN]

/** 사용자가 지금까지 답한 내용. 아직 묻지 않은 항목은 null이다. */
export interface RoutePreference {
  useElevator: boolean | null
  hasTransitCard: boolean | null
  ticketMethod: TicketMethod | null
  hasCash: boolean | null
}
