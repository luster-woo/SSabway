import type { Language } from '@/shared/types/user'

/**
 * 지하철 경로 조회 (ODsay 기반).
 *
 *   POST /api/v1/routes/path
 *
 * ⚠️ 명세 문서와 실제 BE 응답이 어긋나는 지점이 둘 있다. 이 파일은 **BE 코드**를
 *    기준으로 한다 (domain/route/dto/response/RouteSearchResponse·RouteResponse).
 *      - 문서 예시의 `legs` → 실제는 `segments`
 *      - 문서 표의 `arriveTime`("20분")·`transfer`·`laneName` 최상위 필드 →
 *        실제는 `totalTime`(number)·`transferCount`(number)이고 노선 정보는
 *        `segments[]` 안에 있다.
 *
 * 인증은 필요 없다. `/api/v1/routes/**` 는 SecurityConfig 에서 permitAll 이라
 * 호출부는 `publicApi` 를 쓴다.
 */

/**
 * 노선 식별자. BE `SubwayLane` enum 의 이름을 그대로 받는다.
 *
 * ODsay 의 subwayCode 가 아니라 이 상수로 노선 색·번호를 정하라는 것이 BE 의
 * 의도다(SubwayLane 주석). 모르는 코드는 서버가 UNKNOWN 으로 떨어뜨리므로
 * 새 노선이 개통해도 응답 전체가 깨지지는 않는다 — 화면은 UNKNOWN 을
 * 표시 가능한 상태로 다뤄야 한다.
 *
 * ⚠️ BE enum 의 `label`("1"·"2"·"3"·"대경")은 응답에 실리지 않는다. Java enum 은
 *    기본적으로 이름만 직렬화되기 때문이다. 동그라미 안 숫자가 필요해지면
 *    프론트에서 이 상수로 매핑하거나 BE 에 필드 추가를 요청할 것.
 */
export const SUBWAY_LANE = {
  DAEGU_LINE_1: 'DAEGU_LINE_1',
  DAEGU_LINE_2: 'DAEGU_LINE_2',
  DAEGU_LINE_3: 'DAEGU_LINE_3',
  DAEGYEONG_LINE: 'DAEGYEONG_LINE',
  UNKNOWN: 'UNKNOWN',
} as const

export type SubwayLane = (typeof SUBWAY_LANE)[keyof typeof SUBWAY_LANE]

/**
 * 요청 본문. 5개 전부 필수다(BE `RouteSearchRequest` 의 @NotNull).
 * 필드명은 BE record 와 1:1이라 그대로 직렬화해 보낸다.
 *
 * X = 경도(longitude), Y = 위도(latitude). 순서가 바뀌기 쉬우니 주의.
 */
export interface RoutePathParams {
  /** 대문자 코드. 소문자로 보내면 enum 역직렬화가 실패해 400 이다. */
  language: Uppercase<Language>
  /** 출발지 경도 */
  startX: number
  /** 출발지 위도 */
  startY: number
  /** 도착지 경도 */
  endX: number
  /** 도착지 위도 */
  endY: number
}

/**
 * 한 번 타고 내리는 구간. 환승이 없으면 1개, 1회 환승이면 2개.
 * (도보 구간은 서버가 걸러내므로 지하철 구간만 온다)
 */
export interface RouteSegment {
  /** 노선 식별자. 색·번호 매핑용 */
  lane: SubwayLane
  /** 표시용 노선명. ODsay 원문이다. 예: "대구 1호선" */
  laneName: string
  /**
   * 1 = 상행, 2 = 하행.
   *
   * `segments[0].wayCode` 가 역 내 안내(/routes/navi)에서 어느 승강장으로
   * 갈지를 정하는 단서다(BE RouteSegmentResponse 주석). 버리지 말 것.
   * 환승 이후 구간에는 없을 수 있어 nullable 이다.
   */
  wayCode: number | null
  /** "…방면"에 쓸 종점명. wayCode 나 노선을 모르면 null 이다. */
  direction: string | null
  /**
   * 개찰구(승강장) 노드 id. BE 가 (역·노선·wayCode)로 계산해 준다
   * (RouteSegmentResponse.pointCode ← StartPoint.codeOf). 이 값을 역 내 안내
   * (/routes/navi)의 finalPoint 로 그대로 넘긴다 — wayCode 로 다시 계산하지 말 것.
   *
   * 매핑이 없으면 null 이다(지원하지 않는 역·노선 조합, 환승 이후 구간,
   * wayCode 누락 등). null 이면 실내 안내를 시작하지 않는다 — 엉뚱한 승강장으로
   * 안내하는 것보다 낫다.
   */
  pointCode: string | null
  startStation: string
  endStation: string
  /** 이 구간에서 지나는 역 수 */
  stationCount: number
  /** 이 구간 소요 시간(분) */
  sectionTime: number
}

/** 추천 경로 한 건. 화면의 카드 하나에 대응한다. */
export interface RoutePath {
  firstStartStation: string
  lastEndStation: string
  /** 총 소요 시간(분) */
  totalTime: number
  /** 총 요금(원) */
  payment: number
  /** 환승 횟수. 서버가 `segments.length - 1` 로 계산해 준다. */
  transferCount: number
  segments: RouteSegment[]
}

/**
 * 응답 `data`. BE `RouteSearchResponse` 그대로다.
 *
 * ⚠️ `data.content.path` 가 아니라 `data.path` 다. 한때 `content` 계층을
 *    가정한 타입이 있었는데 서버에는 그런 래핑이 없다.
 *
 * 배열은 소요 시간 오름차순으로 정렬되어 온다(RouteService 의 sorted).
 * 즉 `path[0]` 이 곧 가장 빠른 경로다.
 */
export interface RoutePathResponse {
  path: RoutePath[]
}
