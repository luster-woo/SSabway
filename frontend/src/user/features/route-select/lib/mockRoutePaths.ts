import type { RoutePath } from '@/shared/types/route'

/**
 * 출발지(현재 위치한 역·출구). 표지판 분석·GPS 결과를 담는 스토어가 아직 없어
 * 목 상수로 둔다.
 *
 * TODO: 출발지 스토어가 생기면 이 상수를 삭제하고 스토어 값을 참조한다.
 */
export const MOCK_ORIGIN = {
  name: '홍대입구역 3번 출구',
  longitude: 126.923665,
  latitude: 37.557192,
} as const

/**
 * 목적지를 고르지 않고 이 화면에 직접 들어온 경우에만 쓰는 목 목적지.
 * (목적지 스토어에 값이 있으면 그 값이 우선한다)
 *
 * TODO: BE 연동 시 삭제하고 "목적지를 먼저 선택해 주세요" 안내로 대체한다.
 */
export const MOCK_DESTINATION = {
  name: '명동성당',
  longitude: 126.987206,
  latitude: 37.563446,
} as const

/**
 * 명세(GET /routes/path)의 data.content.path 형식을 그대로 따른 목 응답.
 * 좌표는 fetchRoutePaths에서 실제 요청 좌표로 덮어쓴다.
 *
 * TODO: BE 연동 시 이 파일을 삭제한다.
 */
export const MOCK_ROUTE_PATHS: readonly RoutePath[] = [
  {
    startX: MOCK_ORIGIN.longitude,
    startY: MOCK_ORIGIN.latitude,
    endX: MOCK_DESTINATION.longitude,
    endY: MOCK_DESTINATION.latitude,
    firstStartStation: '홍대입구역',
    lastEndStation: '명동역',
    transfer: [{ station: '동대문역사문화공원역' }],
    sectionTime: 24,
    laneName: '2호선 · 4호선',
    arriveTime: '24분',
    payment: '1,550원',
  },
  {
    startX: MOCK_ORIGIN.longitude,
    startY: MOCK_ORIGIN.latitude,
    endX: MOCK_DESTINATION.longitude,
    endY: MOCK_DESTINATION.latitude,
    firstStartStation: '홍대입구역',
    lastEndStation: '을지로입구역',
    transfer: [],
    sectionTime: 31,
    laneName: '2호선',
    arriveTime: '31분',
    payment: '1,550원',
  },
]
