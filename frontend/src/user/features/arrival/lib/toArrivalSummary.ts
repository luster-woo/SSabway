import type { GuideInfo } from '@/shared/types/guide'
import type { SelectedRoute } from '@/shared/types/route'

/** 도착 완료 화면에 보여줄 이번 이동 요약 */
export interface ArrivalSummary {
  /** 출발지 — 안내 정보 화면과 같은 표기(예: "대구역 3F S3_16") */
  origin: string
  /** 목적지 — 안내 정보 화면과 같은 표기(예: "대구역 1호선 개찰구") */
  destination: string
  /** 하차역 — 첫 지하철 구간의 하차역에 '역'을 붙인 표기(예: "반월당역") */
  alightStation: string
}

/** 역 이름에 '역'을 붙인다. 이미 '역'으로 끝나면 그대로 둔다. */
function withStationSuffix(name: string): string {
  return name.endsWith('역') ? name : `${name}역`
}

/**
 * 스토어 값으로 도착 요약을 만든다.
 *
 * 별도 API 를 부르지 않는다 — 필요한 값이 모두 앞선 화면들의 선택이다.
 * origin·destination 은 안내 정보 화면과 같은 표기를 그대로 받는다(useGuideInfo).
 * 경로를 고르지 않은 채 들어왔으면(URL 직접 진입·세션 만료) null 이고, 화면이
 * 안내 문구로 대체한다.
 */
export function toArrivalSummary(
  selectedRoute: SelectedRoute | null,
  guideInfo: GuideInfo | null,
): ArrivalSummary | null {
  if (!selectedRoute || !guideInfo) return null

  /*
    하차역 — 첫 지하철 구간의 하차역. 환승이면 환승역, 직통이면 도착역이다.
    노선 정보를 못 얻으면(구버전 응답 등) 최종 도착역으로 폴백한다.
  */
  const alight = selectedRoute.alightStation ?? selectedRoute.arrivalStation

  return {
    // 출발지·목적지는 안내 정보(userinfo) 화면과 완전히 같은 표기를 쓴다.
    origin: guideInfo.origin,
    destination: guideInfo.destination,
    alightStation: withStationSuffix(alight),
  }
}
