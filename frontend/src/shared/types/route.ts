/**
 * 경로 조회 (ODSay 기반) 타입.
 * 명세: GET /api/v1/routes/path
 */

/** 경로 조회 요청 좌표. (X = 경도, Y = 위도) */
export interface RoutePathParams {
  startX: number
  startY: number
  endX: number
  endY: number
}

/** 환승역 한 곳. 명세의 transfer 배열 원소. */
export interface TransferStation {
  station: string
}

/**
 * 추천 경로 한 건.
 *
 * 명세가 arriveTime·payment를 문자열("20분", "1550원")로 정의했다.
 * 정렬·비교가 필요하면 숫자로 파싱해서 쓴다. (routeBadge.ts)
 */
export interface RoutePath {
  /** 출발지 X좌표 (경도) */
  startX: number
  /** 출발지 Y좌표 (위도) */
  startY: number
  /** 도착지 X좌표 (경도) */
  endX: number
  /** 도착지 Y좌표 (위도) */
  endY: number
  /** 출발역 */
  firstStartStation: string
  /** 최종 도착역 */
  lastEndStation: string
  /** 환승역 목록. 비어 있으면 환승 없는 경로다. */
  transfer: TransferStation[]
  /** 구간 소요 시간(분) */
  sectionTime: number
  /** 지하철 호선 정보 */
  laneName: string
  /** 총 소요 시간 ("20분") */
  arriveTime: string
  /** 총 요금 ("1550원") */
  payment: string
}

/** 명세의 data.content — 경로 후보 목록을 감싸는 객체 */
export interface RoutePathContent {
  path: RoutePath[]
}
