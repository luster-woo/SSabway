/**
 * 경로 상세 안내(역 내 단계별 안내)의 화면용 타입.
 * 원본: POST /api/v1/routes/navi — `shared/types/navigation.ts` 참고.
 *
 * 서버 응답(NavRouteStep)을 그대로 쓰지 않고 한 겹 두는 이유는, 화면이 필요로
 * 하는 값 중 서버가 안 주는 것이 있어서다(단계 번호, 도면 좌표). 매핑은
 * `user/features/route-guide/lib/mapNaviResponse.ts` 한 곳에서만 한다.
 *
 * 한 단계 = 지시문 한 줄 + 그 끝에서 확인할 지점 하나.
 * 사용자는 지점을 하나씩 확인하며 단계를 넘긴다.
 */

import type {
  NavNodeType,
  NavPoiCategory,
  NavPurpose,
  NavWaypoint,
} from '@/shared/types/navigation'

/** 표지판이 가리키는 진행 방향. 화살표 회전에 쓴다. */
export const SIGN_DIRECTION = {
  /** 직진 */
  STRAIGHT: 'STRAIGHT',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  /** 위층(계단·에스컬레이터 상행) */
  UP: 'UP',
  /** 아래층(계단·에스컬레이터 하행) */
  DOWN: 'DOWN',
} as const

export type SignDirection = (typeof SIGN_DIRECTION)[keyof typeof SIGN_DIRECTION]

/**
 * 엘리베이터 구간이 향하는 층. 카드의 애니메이션 방향을 이 값이 정한다.
 *
 * SignDirection 의 UP·DOWN 과 값이 겹치지만 뜻이 다르다 — 저쪽은 표지판이
 * 가리키는 방향(화살표 회전)이고, 이쪽은 엘리베이터가 실제로 가는 쪽이다.
 */
export const ELEVATOR_DIRECTION = {
  UP: 'UP',
  DOWN: 'DOWN',
} as const

export type ElevatorDirection =
  (typeof ELEVATOR_DIRECTION)[keyof typeof ELEVATOR_DIRECTION]

/** 표지판 오른쪽에 붙는 노선 뱃지 */
export interface SignLineBadge {
  /** 노선 번호·기호 ("4") */
  label: string
  /** 노선 공식 색. ("#00a5de") */
  color: string
}

/**
 * 단계마다 한 장씩 보여주는 표지판.
 *
 * ⚠️ BE 는 표지판에 대해 사진 주소(imageUrl) 하나만 준다. exitNumber·subtitle·
 *    lineBadge·direction 은 서버에 없는 값이라 지금은 비어 있고, SignBoardCard 의
 *    "사진 없을 때 그려서 대체" 분기가 title 로 채워 그린다.
 *
 *    표지판이 아닌 지점(개찰구·편의점·엘리베이터)에는 이 객체를 만들지 않는다.
 *    그런 곳에 표지판 카드를 띄우면 사용자가 있지도 않은 표지판을 찾게 된다.
 */
export interface GuideSign {
  /** 출구 번호 ("3"). 출구 표지판이 아니면 null */
  exitNumber: string | null
  /** 표지판 본문 */
  title: string
  /** 본문 아래 영문 표기 */
  subtitle: string
  lineBadge: SignLineBadge | null
  direction: SignDirection
  /** 실제 표지판 사진(S3 URL). 없으면 위 필드로 그려서 대체한다. */
  photoUrl: string | null
}

/** 층간 이동 지점이 도착하는 반대편 층의 좌표 */
export interface GuidePointLink {
  floor: string
  view: string
  x: number
  y: number
}

/**
 * 단계 지점의 역 도면 위 위치. 좌표계는 stationMapData 와 같다.
 *
 * ⚠️ BE 응답(RouteStepResponse)에는 좌표가 없다. 프론트가 노드 id(`to`)로
 *    도면 데이터에서 직접 찾아 쓰라는 설계다 — 서버 주석이 "프론트가 지도 JSON 을
 *    갖고 있어서 edgeId 로 직접 찾으면 되고, 그쪽이 응답도 가볍다"고 밝힌다.
 *    그 조회가 붙기 전까지 이 값은 null 이고, 지도는 목 경로로 표시된다.
 */
export interface GuidePoint {
  floor: string
  /** 이 단계를 보여줄 뷰 (stationMapData 의 STATION_MAP_VIEWS key) */
  view: string
  x: number
  y: number
  /** 층을 넘는 지점(에스컬레이터 등)이면 반대편 층 좌표 */
  up?: GuidePointLink
}

/** 경로 상세 안내의 한 단계 */
export interface GuideStep {
  /** 1부터 시작하는 단계 번호. 서버에 없어 매핑에서 붙인다. */
  order: number
  /** 이번 단계에서 해야 할 행동 (BE `text`. 없으면 폴백 문구) */
  instruction: string
  /** 표지판에 도착하는 구간에만. 그 외 지점은 null 이고 시설 카드로 안내한다. */
  sign: GuideSign | null
  /** 표지판의 도면 좌표. 미지원이면 null (GuidePoint 주석 참고) */
  point: GuidePoint | null
  /**
   * 시설 카드(ArrivalPointCard)에 실을 사진. 게이트·ATM·매표소·발매기처럼
   * 표지판은 아니지만 실사 사진이 있는 지점만 채워진다. 표지판 사진은
   * sign.photoUrl 을 쓰므로 여기 중복해 넣지 않는다.
   */
  facilityImageUrl: string | null
  /**
   * 엘리베이터를 **타고 가는** 구간(양 끝이 다 엘리베이터)이 향하는 쪽.
   *
   * 이 값이 있는 단계만 ElevatorRideCard 로 그린다. 엘리베이터 앞까지 걸어가는
   * 구간은 null 이고, 실사 사진이 있는 시설 카드가 맡는다.
   */
  elevatorDirection: ElevatorDirection | null

  /*
    아래는 BE 응답 원본 그대로다. 화면이 "무엇에 도착하는 구간인가"로 분기해야
    해서 남긴다 — 개찰구에 도착하는 마지막 구간과 편의점에 들르는 구간은
    같은 지시문이라도 사용자가 할 일이 다르다.
  */
  edgeId: string
  /** 출발 노드 id */
  from: string
  /** 도착 노드 id. 도면 좌표를 찾는 키다. */
  to: string
  arriveType: NavNodeType
  /** POI 일 때만 */
  arriveCategory: NavPoiCategory | null
  /** 이 구간 끝에서 할 일. 스쳐 지나가는 구간이면 null */
  arrivedFor: NavPurpose | null
}

/** 경로 상세 안내 전체 (POST /routes/navi 응답을 화면용으로 옮긴 것) */
export interface RouteGuide {
  /** 총 이동거리(m) */
  totalDistanceM: number
  /** 개찰구 전에 들르는 곳. 바로 탑승이면 빈 배열 */
  waypoints: NavWaypoint[]
  steps: GuideStep[]
}
