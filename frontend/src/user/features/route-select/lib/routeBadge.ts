import type { RoutePath } from '@/shared/types/route'

/**
 * 경로 카드에 붙는 강조 배지.
 *
 * 응답에 배지 필드가 없으므로 후보들을 서로 비교해 프론트에서 계산한다.
 * BE 도 이 분업을 전제로 둔다 — RouteResponse 주석: "빠른 길 / 환승 없음
 * 배지는 프론트가 판단한다 (totalTime 최솟값 / transferCount == 0)".
 */
export const ROUTE_BADGE = {
  /** 소요 시간이 가장 짧은 경로 */
  FASTEST: 'FASTEST',
  /** 환승이 없는 경로 */
  NO_TRANSFER: 'NO_TRANSFER',
  /** 요금이 가장 싼 경로 */
  CHEAPEST: 'CHEAPEST',
} as const

export type RouteBadge = (typeof ROUTE_BADGE)[keyof typeof ROUTE_BADGE]

/**
 * 경로 목록과 같은 순서로 배지를 계산한다. 한 카드에는 배지 하나만 붙인다.
 * 우선순위: 최단 시간 > 환승 없음 > 최소 요금.
 *
 * 동일 조건이 여러 개면 첫 번째 경로에만 붙인다 — 모든 카드에 같은 배지가
 * 달리면 강조의 의미가 사라진다.
 *
 * `totalTime`·`payment` 가 숫자로 오므로 그대로 비교한다. 예전에는 문자열
 * ("24분"·"1,550원")을 정규식으로 파싱했는데, 실제 응답은 처음부터 숫자였다.
 */
export function toRouteBadges(paths: RoutePath[]): (RouteBadge | null)[] {
  if (paths.length === 0) return []

  const minutes = paths.map((path) => path.totalTime)
  const fares = paths.map((path) => path.payment)

  const fastestIndex = minutes.indexOf(Math.min(...minutes))
  const noTransferIndex = paths.findIndex((path) => path.transferCount === 0)
  const cheapestIndex = fares.indexOf(Math.min(...fares))
  // 요금이 모두 같으면 "최소 요금"은 정보가 되지 않는다.
  // 대구 도시철도는 구간 상관없이 단일 요금이라 대부분 이 경우에 해당한다.
  const hasFareGap = new Set(fares).size > 1

  return paths.map((_, index) => {
    if (index === fastestIndex) return ROUTE_BADGE.FASTEST
    if (index === noTransferIndex) return ROUTE_BADGE.NO_TRANSFER
    if (hasFareGap && index === cheapestIndex) return ROUTE_BADGE.CHEAPEST
    return null
  })
}

/**
 * 타임라인에 찍을 역 이름들. 출발역 → 환승역… → 도착역
 *
 * 환승역은 따로 오지 않는다. 구간이 이어 붙는 지점이 곧 환승역이므로
 * 마지막을 뺀 각 구간의 도착역이 환승역이 된다.
 * (segments[0].endStation === segments[1].startStation)
 *
 * segments 가 비는 경우는 서버 계약상 없지만, 비어도 출발·도착 두 점은
 * 그려지도록 firstStartStation·lastEndStation 을 양 끝에 둔다.
 */
export function toStationSequence(path: RoutePath): string[] {
  const transfers = path.segments
    .slice(0, -1)
    .map((segment) => segment.endStation)

  return [path.firstStartStation, ...transfers, path.lastEndStation]
}

/**
 * 카드 부제에 쓸 노선 요약. 예: "대구 1호선 → 대구 2호선"
 *
 * 화살표는 탑승 순서를 나타낸다 — 환승이 있으면 갈아타는 순서대로 이어진다.
 * 노선명은 ODsay 원문(`laneName`)을 그대로 쓴다. BE enum 의 짧은 라벨
 * ("1"·"2"·"대경")은 응답에 실리지 않는다.
 */
export function toLaneSummary(path: RoutePath): string {
  return path.segments.map((segment) => segment.laneName).join(' → ')
}
