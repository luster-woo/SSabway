import type { Place } from '@/shared/types/place'
import type { SelectedRoute } from '@/shared/types/route'

/** 도착 완료 화면에 보여줄 이번 이동 요약 */
export interface ArrivalSummary {
  /** 출발역 */
  originStation: string
  /** 도착역. 화면 제목 아래에 크게 나온다. */
  destinationStation: string
  /**
   * 사용자가 고른 최종 목적지("경북대 북문"). 도착역 자체를 목적지로 골랐거나
   * 목적지 정보가 없으면 null 이라 화면이 이 줄을 감춘다.
   */
  finalDestination: string | null
  /** 총 소요 시간(분) */
  totalMinutes: number
}

/**
 * 스토어 값으로 도착 요약을 만든다.
 *
 * 별도 API 를 부르지 않는다 — 필요한 값이 모두 앞선 화면들의 선택이고, 서버가
 * 다시 계산해 줄 것이 없다. 경로를 고르지 않은 채 이 화면에 들어왔으면
 * (URL 직접 진입·세션 만료) null 이고, 화면이 안내 문구로 대체한다.
 */
export function toArrivalSummary(
  selectedRoute: SelectedRoute | null,
  destination: Place | null,
): ArrivalSummary | null {
  if (!selectedRoute) return null

  const finalName = destination?.name ?? null

  return {
    originStation: selectedRoute.departureStation,
    destinationStation: selectedRoute.arrivalStation,
    finalDestination:
      finalName && finalName !== selectedRoute.arrivalStation
        ? finalName
        : null,
    totalMinutes: selectedRoute.totalTime,
  }
}
