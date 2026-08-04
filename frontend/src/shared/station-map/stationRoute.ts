/**
 * 역 내 경로(표지판 기반)의 공용 타입과 목 데이터.
 *
 * 사용자(경로 상세 안내·화상 페이지)와 관리자(화상 상담의 사용자 위치 지도)가
 * 같은 지도를 같은 경로로 그려야 하므로 shared 에 둔다.
 * (admin/features/consultation-room/useUserRoute.ts 에서 승격 — 8/3)
 */

/** 층간 이동 지점이 도착하는 반대편 층의 좌표 */
export interface RouteStepLink {
  floor: string
  view: string
  x: number
  y: number
}

/**
 * 사용자가 안내받는 역 내 경로의 한 단계.
 *
 * 명세의 GET /routes/navi 응답(order·nextPointType·signImage·text)에는
 * 좌표·층이 없어 지도에 점을 찍을 수 없다. 좌표 포함 응답(또는 별도 API)을
 * BE 에 요청해 둔 상태 — 들어오면 PROTOTYPE_STATION_ROUTE 를 삭제하고
 * 응답을 이 타입으로 매핑한다.
 */
export interface UserRouteStep {
  /** 표지판·시설 ID (S1_04, ST-12, EX-3 …) */
  id: string
  floor: string
  /** 이 단계를 보여줄 뷰 */
  view: string
  x: number
  y: number
  /** 지점 이름 */
  name: string
  /** 표지판에 적힌 문구 */
  sign: string
  /** 이동 수단 (에스컬레이터 등) */
  via?: string
  /** 층을 넘는 지점이면 반대편 층 좌표 */
  up?: RouteStepLink
}

/**
 * 이 단계가 해당 층에서 어디인지 반환한다. 그 층에 없으면 null.
 * 층간 이동 지점은 반대편 층(up)에도 연결점으로 나타난다.
 */
export function toPointOnFloor(
  step: UserRouteStep,
  floor: string,
): { x: number; y: number } | null {
  if (step.floor === floor) return { x: step.x, y: step.y }
  if (step.up?.floor === floor) return { x: step.up.x, y: step.up.y }
  return null
}

/**
 * 프로토타입의 좌표 포함 경로 (대구역, 5단계).
 *
 * 경로 API 에 좌표가 없는 동안 사용자·관리자 지도가 공유하는 목이다.
 * 사용자 쪽 경로 상세 안내(POST /routes/navi)의 단계 수를
 * 맞춰 두었으므로 단계 인덱스로 1:1 대응한다.
 *
 * TODO: 좌표 포함 경로 응답이 생기면 이 상수를 삭제한다.
 */
export const PROTOTYPE_STATION_ROUTE: readonly UserRouteStep[] = [
  {
    id: 'S1_04',
    floor: '1',
    view: '1',
    x: 800,
    y: 857,
    name: '1층 승강장',
    sign: '출구 · 대합실 2F ↑',
  },
  {
    id: 'S1_02',
    floor: '1',
    view: '1',
    x: 1371,
    y: 857,
    name: '개찰구 앞',
    sign: '1 · 2 출구 →   3 · 4 출구 ←',
  },
  {
    id: 'ST-12',
    floor: '1',
    view: '1',
    x: 1286,
    y: 600,
    name: '에스컬레이터 (1층 → 2층)',
    sign: '대합실 2F · 롯데백화점 3F',
    via: '에스컬레이터',
    up: { floor: '2', view: '2A', x: 723, y: 793 },
  },
  {
    id: 'S2_09',
    floor: '2',
    view: '2A',
    x: 360.8,
    y: 937.9,
    name: '3 · 4번 출구 방면',
    sign: '3 · 4 출구 ←',
  },
  {
    id: 'EX-3',
    floor: '2',
    view: '2A',
    x: 174.4,
    y: 927.5,
    name: '대구역 3번 출구',
    sign: '3 출구',
  },
]
