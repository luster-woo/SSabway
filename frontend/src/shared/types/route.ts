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
 * 노선 → 사람이 읽는 표기. 안내 정보 화면의 목적지("대구역 1호선 개찰구")에 쓴다.
 * BE enum 의 label 이 응답에 실리지 않으므로(SubwayLane 주석) 프론트에서 매핑한다.
 * UNKNOWN 은 표기를 만들지 않는다 — 호출부가 노드 코드로 폴백한다.
 */
export const SUBWAY_LANE_LABEL: Record<SubwayLane, string | null> = {
  [SUBWAY_LANE.DAEGU_LINE_1]: '1호선',
  [SUBWAY_LANE.DAEGU_LINE_2]: '2호선',
  [SUBWAY_LANE.DAEGU_LINE_3]: '3호선',
  [SUBWAY_LANE.DAEGYEONG_LINE]: '대경선',
  [SUBWAY_LANE.UNKNOWN]: null,
}

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
   * (RouteSegmentResponse.pointCode). 역 내 안내(/routes/navi)의 finalPoint 로
   * 그대로 넘긴다 — wayCode 로 다시 계산하지 말 것.
   *
   * 매핑이 없으면 null 이다(지원하지 않는 조합·환승 이후 구간 등). null 이면
   * 실내 안내를 시작하지 않는다 — 엉뚱한 승강장으로 안내하는 것보다 낫다.
   */
  pointCode: string | null
  /**
   * 이 구간 출발역의 DB id (`stations.id`). 명세 8/5 추가.
   *
   * 상담 요청(`POST /consultations`)의 `stationId` 로 그대로 넘긴다 — 서버가
   * 이 id 로 담당 역무원을 찾는다. **첫 구간에만 값이 있고 환승 이후 구간은
   * null** 이다(지원 역이 아직 대구역뿐이라 사실상 `segments[0]` 만 1 이다).
   * 그래서 "사용자가 실제로 타는 출발역"의 id 는 `segments[0].stationId` 다.
   *
   * pointCode 와 같은 자리에 있지만 뜻이 다르다 —
   * pointCode 는 역 **안**의 개찰구 노드, stationId 는 **역** 자체다.
   */
  stationId: number | null
  startStation: string
  endStation: string
  /** 이 구간에서 지나는 역 수 */
  stationCount: number
  /** 이 구간 소요 시간(분) */
  sectionTime: number
}

/**
 * 추천 경로 한 건. 화면의 카드 하나에 대응한다.
 *
 * ⚠️ 역 이름이 두 벌이다 (명세 8/5 변경). 요청의 `language` 에 맞춰 번역된
 *    표기와, 한국어 표기가 따로 온다. **섞어 쓰면 안 된다.**
 *      - `firstStartStation`·`lastEndStation` → 화면에 그대로 뿌리는 값
 *      - `firstStartStationKor`·`lastEndStationKor` → 서버로 보낼 값
 *    서버는 역 이름을 `stations.name_ko` 와 정확 비교하므로, 번역된 표기를
 *    보내면 외국어 사용자만 404 STAFF_NOT_FOUND 로 조용히 실패한다.
 *
 * segments 안의 `laneName`·`direction`·`startStation`·`endStation` 도 번역된
 * 표기다. 이쪽은 한국어 짝이 없고 화면 표시에만 쓰이므로 문제되지 않는다.
 */
export interface RoutePath {
  /** 출발역 — 사용자 선택 언어 표기. 화면 표시용 */
  firstStartStation: string
  /** 출발역 — 한국어 표기. 서버 전달용 */
  firstStartStationKor: string
  /** 최종 도착역 — 사용자 선택 언어 표기. 화면 표시용 */
  lastEndStation: string
  /** 최종 도착역 — 한국어 표기. 서버 전달용 */
  lastEndStationKor: string
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

/**
 * 사용자가 경로 선택 화면에서 확정한 경로의 요약.
 *
 * 경로 응답에서 **이후 화면들이 쓰는 값만** 뽑아 둔 것이다. 화면에 뿌릴 표기와
 * 서버에 보낼 표기를 **둘 다** 들고 간다 — 경로 조회는 목적지를 정한 시점에
 * 한 번만 하고, 상담 요청은 그보다 훨씬 뒤(안내 중 도움 요청)에 일어나므로
 * 그때 다시 조회해 한국어 표기를 얻어올 수 없다.
 *
 * - 표시용(`departureStation`·`arrivalStation`) → 안내 정보 확인·도착 완료 화면
 * - 전달용(`*Kor`, `stationId`) → 상담 요청(`POST /consultations`)
 */
export interface SelectedRoute {
  /** 출발역 — 사용자 언어 표기. 화면 표시용 */
  departureStation: string
  /** 출발역 — 한국어 표기. 상담 요청의 departure 로 보낸다 */
  departureStationKor: string
  /** 최종 도착역 — 사용자 언어 표기. 화면 표시용 */
  arrivalStation: string
  /** 최종 도착역 — 한국어 표기. 상담 요청의 destination 으로 보낸다 */
  arrivalStationKor: string
  /**
   * 출발역에서 처음 타는 노선. 안내 정보 화면의 목적지 표기
   * ("대구역 1호선 개찰구")에 쓴다. `segments[0].lane` 에서 뽑는다.
   * 구버전 응답·비지원 조합이면 null 이라 호출부가 노드 코드로 폴백한다.
   */
  boardingLane: SubwayLane | null
  /**
   * 첫 지하철 구간의 하차역. 도착 완료 화면의 "하차역"에 쓴다(환승이면 환승역,
   * 직통이면 도착역). `segments[0].endStation` 에서 뽑는다. 없으면 null 이라
   * 호출부가 최종 도착역으로 폴백한다.
   */
  alightStation: string | null
  /**
   * 출발역 DB id. 상담 요청의 stationId 로 보낸다.
   *
   * 서버가 안 줬을 때(구버전 응답·비지원 역)를 대비해 nullable 이다.
   * null 이면 상담 요청을 보낼 수 없다 — 요청 필수 필드이기 때문이다.
   */
  stationId: number | null
  /** 총 소요 시간(분) */
  totalTime: number
  /** 환승 횟수 */
  transferCount: number
}
