import type { RoutePath } from '@/shared/types/route'

/**
 * 경로 카드에 붙는 강조 배지.
 *
 * 명세에 배지 필드가 없으므로 응답을 서로 비교해 프론트에서 계산한다.
 * (BE에 필드가 추가되면 toRouteBadges만 교체한다)
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

/** "1시간 24분" · "24분" → 84 · 24. 해석 불가면 Infinity(비교에서 뒤로 밀린다). */
export function parseMinutes(arriveTime: string): number {
  const hour = /(\d+)\s*시간/.exec(arriveTime)
  const minute = /(\d+)\s*분/.exec(arriveTime)

  if (!hour && !minute) {
    const digits = arriveTime.replace(/\D/g, '')
    return digits ? Number(digits) : Number.POSITIVE_INFINITY
  }

  return Number(hour?.[1] ?? 0) * 60 + Number(minute?.[1] ?? 0)
}

/** "1,550원" → 1550. 해석 불가면 Infinity. */
export function parseFare(payment: string): number {
  const digits = payment.replace(/\D/g, '')
  return digits ? Number(digits) : Number.POSITIVE_INFINITY
}

/**
 * 경로 목록과 같은 순서로 배지를 계산한다. 한 카드에는 배지 하나만 붙인다.
 * 우선순위: 최단 시간 > 환승 없음 > 최소 요금.
 *
 * 동일 조건이 여러 개면 첫 번째 경로에만 붙인다 — 모든 카드에 같은 배지가
 * 달리면 강조의 의미가 사라진다.
 */
export function toRouteBadges(paths: RoutePath[]): (RouteBadge | null)[] {
  if (paths.length === 0) return []

  const minutes = paths.map((path) => parseMinutes(path.arriveTime))
  const fares = paths.map((path) => parseFare(path.payment))

  const fastestIndex = minutes.indexOf(Math.min(...minutes))
  const noTransferIndex = paths.findIndex((path) => path.transfer.length === 0)
  const cheapestIndex = fares.indexOf(Math.min(...fares))
  // 요금이 모두 같으면 "최소 요금"은 정보가 되지 않는다.
  const hasFareGap = new Set(fares).size > 1

  return paths.map((_, index) => {
    if (index === fastestIndex) return ROUTE_BADGE.FASTEST
    if (index === noTransferIndex) return ROUTE_BADGE.NO_TRANSFER
    if (hasFareGap && index === cheapestIndex) return ROUTE_BADGE.CHEAPEST
    return null
  })
}

/** 타임라인에 찍을 역 이름들. 출발역 → 환승역… → 도착역 */
export function toStationSequence(path: RoutePath): string[] {
  return [
    path.firstStartStation,
    ...path.transfer.map((transfer) => transfer.station),
    path.lastEndStation,
  ]
}
