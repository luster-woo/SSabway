import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'

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
 * 명세의 GET /routes/navi 응답(order·nextPointType·signImage·text)에는 좌표·층이 없어
 * 지도에 번호를 찍을 수 없다. 또 그 API 는 요청 파라미터가 사용자 입력값
 * (hasTrafficCard·payment·hasCash)이라 역무원이 호출할 수도 없다.
 *
 * TODO: 아래 형태로 상담별 경로 조회 API 신설을 요청한다.
 *       GET /api/v1/admins/consultations/{consultationId}/route
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

const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * BE 개발 전이라 목 응답을 사용한다. 프로토타입의 경로 데이터를 그대로 옮겼다.
 * 연동 시 fetchUserRoute 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_ROUTE: readonly UserRouteStep[] = [
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

async function fetchUserRoute(
  consultationId: number,
): Promise<UserRouteStep[]> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<{ routes: UserRouteStep[] }>>(
  //     endpoints.admin.consultationRoute(consultationId),
  //   )
  //   return res.data.data.routes
  await delay(MOCK_LATENCY_MS)

  if (!Number.isFinite(consultationId) || consultationId <= 0) {
    throw new Error('잘못된 상담 ID입니다.')
  }

  return [...MOCK_ROUTE]
}

/**
 * 사용자가 안내받는 경로.
 *
 * 모달을 열 때만 조회한다. 사용자가 재촬영해 경로가 바뀔 수 있어 캐시를 오래 두지 않는다.
 */
export function useUserRoute(consultationId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.consultation.detail(consultationId), 'route'],
    queryFn: () => fetchUserRoute(consultationId),
    enabled,
  })
}
