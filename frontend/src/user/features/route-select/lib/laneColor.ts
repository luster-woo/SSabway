import { SUBWAY_LANE, type SubwayLane } from '@/shared/types/route'

/**
 * 노선별 대표 색. 대구 도시철도 노선색을 따른다.
 *   1호선 빨강 · 2호선 초록 · 3호선 노랑 · 대경선 파랑
 *
 * 모르는 노선(UNKNOWN)은 회색으로 떨어뜨려, 새 노선이 개통해도 화면이 깨지지
 * 않게 한다. 색은 Tailwind 테마 토큰이 아니라 노선 고유값이라 hex 로 둔다.
 */
const LANE_COLOR: Record<SubwayLane, string> = {
  [SUBWAY_LANE.DAEGU_LINE_1]: '#E4002B',
  [SUBWAY_LANE.DAEGU_LINE_2]: '#00A64F',
  [SUBWAY_LANE.DAEGU_LINE_3]: '#F2B500',
  [SUBWAY_LANE.DAEGYEONG_LINE]: '#0054A6',
  [SUBWAY_LANE.UNKNOWN]: '#94a3b8',
}

/** 노선 식별자 → 대표 색(hex). 모르는 값은 회색 폴백. */
export function laneColor(lane: SubwayLane): string {
  return LANE_COLOR[lane] ?? LANE_COLOR[SUBWAY_LANE.UNKNOWN]
}
