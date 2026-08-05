import type { NearestStation } from '@/shared/types/station'

/**
 * 지원 역의 실세계 위경도.
 *
 * 표지판 인식은 역 '이름'만 돌려준다(BE SignPredictResponse.stationName) —
 * 좌표가 없다. 하지만 경로 조회(/routes/path 의 startX/startY)와 목적지 지도의
 * 출발지 점은 좌표가 필요하다. 그 좌표를 여기서 이름으로 붙인다.
 *
 * 파일럿은 대구역 하나다(BE SUPPORTED_START_STATIONS 와 동일). 역이 늘면
 * 이 표에 한 줄씩 추가한다.
 */
const STATION_COORDS: Record<string, { latitude: number; longitude: number }> =
  {
    대구역: { latitude: 35.87565, longitude: 128.5961 },
  }

/** 파일럿 기본 역. 이름이 표에 없을 때의 폴백(경로 조회가 깨지지 않게 한다). */
const PILOT_STATION = '대구역'

/**
 * 표지판이 준 역 이름에 좌표를 붙여 출발지(originStation)로 만든다.
 *
 * 표에 없는 이름이면 파일럿(대구역) 좌표로 폴백한다 — 지원 역이 대구역뿐이라
 * ODsay 반경 밖 좌표로 SUBWAY_ROUTE_NOT_FOUND 를 받는 것보다 안전하다.
 */
export function toOriginStation(stationName: string): NearestStation {
  const coords = STATION_COORDS[stationName] ?? STATION_COORDS[PILOT_STATION]
  return {
    name: stationName,
    latitude: coords.latitude,
    longitude: coords.longitude,
  }
}
