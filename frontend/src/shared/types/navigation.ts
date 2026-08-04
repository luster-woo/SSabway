/**
 * 역 내 경로(POST /api/v1/routes/navi) 의 요청·응답 타입.
 *
 */

/** BE Language enum. 요청에는 반드시 대문자로 보낸다. */
export type NavLangCode = 'KO' | 'EN' | 'JA' | 'ZH'

/**
 * 개찰 전에 들러야 하는 이유 (Purpose.java)
 *
 * 요청으로 보낼 수 있는 값은 앞의 셋뿐이다. WITHDRAW_CASH 와 TO_GATE 는
 * 서버가 붙이는 값이라 응답에서만 나온다 — 요청에 실으면 "현금 뽑는 게 목적"인
 * 이상한 경로가 만들어진다. (RouteRequest.hasValidNeeds 참고)
 */
export const NAV_PURPOSE = {
  /** 교통카드 충전 — 편의점 · 매표소 */
  CHARGE: 'CHARGE',
  /** 교통카드 구매 — 편의점 (구매와 충전을 한 번에) */
  BUY_CARD: 'BUY_CARD',
  /** 1회권 발권 — 발매기 */
  SINGLE_TICKET: 'SINGLE_TICKET',
  /** 현금 인출 — ATM. 서버가 붙인다 */
  WITHDRAW_CASH: 'WITHDRAW_CASH',
  /** 개찰구로 이동. 서버가 붙인다 */
  TO_GATE: 'TO_GATE',
} as const

export type NavPurpose = (typeof NAV_PURPOSE)[keyof typeof NAV_PURPOSE]

/** 요청의 needs 로 보낼 수 있는 값만 좁힌 타입 */
export type NavNeeds =
  | typeof NAV_PURPOSE.CHARGE
  | typeof NAV_PURPOSE.BUY_CARD
  | typeof NAV_PURPOSE.SINGLE_TICKET

/** 경로 그래프의 노드 종류 (NodeType.java) */
export const NAV_NODE_TYPE = {
  /** 안내 표지판. 이 종류만 사진(imageUrl)이 있다 */
  SIGNAGE: 'SIGNAGE',
  ELEVATOR: 'ELEVATOR',
  EXIT: 'EXIT',
  GATE: 'GATE',
  /** 편의점·ATM·매표소·발매기 등. 세부 종류는 arriveCategory */
  POI: 'POI',
} as const

export type NavNodeType = (typeof NAV_NODE_TYPE)[keyof typeof NAV_NODE_TYPE]

/** 편의시설 종류 (PoiCategory.java) */
export const NAV_POI_CATEGORY = {
  /** 편의점 — 충전·구매 */
  STORE: 'STORE',
  /** 매표소 — 충전만 */
  TICKET_OFFICE: 'TICKET_OFFICE',
  /** 발매기 — 1회권만 */
  TICKET_MACHINE: 'TICKET_MACHINE',
  ATM: 'ATM',
  TOILET: 'TOILET',
} as const

export type NavPoiCategory =
  (typeof NAV_POI_CATEGORY)[keyof typeof NAV_POI_CATEGORY]

/**
 * 역 내 경로 요청 본문 (RouteRequest.java)
 *
 * startPoint·finalPoint·readyToGo·langCode 는 @NotBlank/@NotNull 이라
 * 하나라도 빠지면 400 이다. 나머지 셋은 readyToGo 가 false 일 때만 의미가 있다.
 */
export interface NavRouteRequest {
  /** 표지판 인식 모델이 내놓은 출발 노드 id (예: "S3_02") */
  startPoint: string
  /** 개찰구 노드 id (예: "GA0_01") */
  finalPoint: string
  /** 교통카드가 있고 잔액도 충분한가 */
  readyToGo: boolean
  /** readyToGo 가 false 일 때 무엇이 필요한지. true 면 서버가 무시한다 */
  needs?: NavNeeds
  /** readyToGo 가 false 일 때만 의미 있음 */
  hasCash?: boolean
  /**
   * true  → 계단을 못 쓰는 것으로 보고 계단 구간을 뺀다
   * false → 엘리베이터를 안 쓰겠다는 뜻이라 층간 엘리베이터 구간을 뺀다
   * 생략하면 false 다.
   */
  useElevator?: boolean
  langCode: NavLangCode
}

/** 들러야 하는 곳 요약 (WaypointResponse.java) */
export interface NavWaypoint {
  purpose: NavPurpose
  nodeId: string
  category: NavPoiCategory
}

/**
 * 경로의 한 구간 (RouteStepResponse.java)
 *
 * ⚠️ edgeId 는 한 응답 안에서 중복될 수 있다. 편의점처럼 막다른 갈래를 들렀다
 *    되돌아 나오면 같은 엣지를 두 번 지나기 때문이다. 목록의 key 로 쓰면 안 된다.
 */
export interface NavRouteStep {
  edgeId: string
  /** 출발 노드 id */
  from: string
  /** 도착 노드 id */
  to: string
  arriveType: NavNodeType
  /** POI 일 때만 값이 있다 */
  arriveCategory: NavPoiCategory | null
  /**
   * 선택한 언어의 안내 문구.
   *
   * 문구 데이터가 없는 엣지가 있을 수 있어 nullable 로 둔다
   * (GuideTextRepository.find 가 못 찾으면 null). 화면은 폴백 문구를 쓴다.
   */
  text: string | null
  /** 표지판 도착일 때만. 그 외에는 null */
  imageUrl: string | null
  /**
   * 이 구간 끝에서 할 일. 경유지에 "도착하는" 구간에만 값이 있고,
   * 스쳐 지나가기만 하면 null 이다. 개찰구로 향하는 마지막 구간도 null
   * (서버가 TO_GATE 를 빼고 내려준다 — NavigationService.toSteps 참고).
   */
  arrivedFor: NavPurpose | null
}

/** 역 내 경로 응답 (RouteResponse.java) */
export interface NavRouteResponse {
  /** 총 이동거리(m) */
  totalDistanceM: number
  waypoints: NavWaypoint[]
  steps: NavRouteStep[]
}

/**
 * 역 내 경로 실패 코드 (ErrorCode.java)
 *
 * 상태코드가 같아도 사용자가 할 수 있는 일이 다르다 —
 * NO_STEP_FREE_ROUTE 는 "엘리베이터 없이 다시 시도"가 가능하지만
 * ROUTE_NOT_FOUND 는 그렇지 않다. 그래서 코드로 갈라 안내한다.
 */
export const NAV_ERROR_CODE = {
  /** 400 — startPoint·finalPoint 가 그래프에 없는 id */
  NAV_NODE_NOT_FOUND: 'NAV_NODE_NOT_FOUND',
  /** 400 — readyToGo=false 인데 needs 가 없음 */
  NAV_NEEDS_REQUIRED: 'NAV_NEEDS_REQUIRED',
  /** 404 — 이동할 수 있는 경로가 없음 */
  NAV_ROUTE_NOT_FOUND: 'NAV_ROUTE_NOT_FOUND',
  /** 404 — 계단 없이 갈 수 있는 경로가 없음 (계단으로는 갈 수 있다) */
  NAV_NO_STEP_FREE_ROUTE: 'NAV_NO_STEP_FREE_ROUTE',
  /** 503 — 서버가 경로 그래프를 아직 못 읽음 */
  NAV_GRAPH_NOT_LOADED: 'NAV_GRAPH_NOT_LOADED',
} as const

export type NavErrorCode = (typeof NAV_ERROR_CODE)[keyof typeof NAV_ERROR_CODE]
