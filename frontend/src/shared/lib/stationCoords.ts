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

/**
 * 역 이름(한국어) → i18n 키.
 *
 * 표지판 인식(BE SignPredictResponse.stationName)은 언어와 무관하게 한국어
 * 이름만 돌려준다("대구역"). 스토어에는 그 한국어 이름을 그대로 둬야 한다 —
 * 좌표 조회(STATION_COORDS)와 BE 대조가 이 이름을 키로 쓰기 때문이다.
 * 화면에 보일 때만 이 표로 사용자 언어 표기를 찾는다.
 *
 * 지원 역이 늘면 STATION_COORDS 와 함께 여기 한 줄씩 추가하고 4개 로케일에
 * 같은 키를 넣는다.
 */
const STATION_NAME_KEY: Record<string, string> = {
  대구역: 'station.daegu',
}

/** t 함수의 최소 형태. i18next TFunction 의 제네릭에 묶이지 않게 좁혀 받는다. */
type TranslateFn = (key: string, options?: { defaultValue?: string }) => string

/**
 * 저장된 역 이름을 화면 표기용으로 바꾼다.
 *
 * 표에 없는 이름 — 사용자가 지도에서 직접 고른 장소(MANUAL)나 아직 등록하지
 * 않은 역 — 은 원문을 그대로 돌려준다. 구글 장소 이름은 이미 사용자 언어로
 * 검색된 결과라 번역할 것이 없다.
 */
export function localizeStationName(
  name: string | null | undefined,
  t: TranslateFn,
): string | null {
  if (!name) return null
  const key = STATION_NAME_KEY[name]
  return key ? t(key, { defaultValue: name }) : name
}
