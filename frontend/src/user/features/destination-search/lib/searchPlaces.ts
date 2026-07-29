import type { Place } from '@/shared/types/place'
import { loadNaverMaps } from '@/user/features/destination-search/lib/loadNaverMaps'

export const SEARCH_ERROR = {
  /** 검색은 됐지만 결과가 0건 */
  NO_RESULT: 'NO_RESULT',
  /** SDK 로드 실패·네트워크 오류 등 */
  FAILED: 'FAILED',
} as const
export type SearchErrorType = (typeof SEARCH_ERROR)[keyof typeof SEARCH_ERROR]

export class PlaceSearchError extends Error {
  readonly reason: SearchErrorType

  constructor(reason: SearchErrorType) {
    super(`place search failed: ${reason}`)
    this.name = 'PlaceSearchError'
    this.reason = reason
  }
}

/** 한 번에 보여줄 최대 후보 수. 바텀시트에서 스크롤 없이 훑을 수 있는 정도. */
const MAX_RESULTS = 10

function toPlace(
  address: naver.maps.Service.GeocodeAddress,
  useEnglish: boolean,
): Place {
  const road = address.roadAddress.trim()
  const jibun = address.jibunAddress.trim()
  const english = address.englishAddress.trim()

  const primary = (useEnglish ? english : road) || road || jibun
  const secondary = primary === jibun ? road : jibun

  return {
    // 같은 좌표가 도로명/지번으로 두 번 내려오는 경우가 있어 좌표+이름으로 구분한다.
    placeId: `${address.x},${address.y}:${primary}`,
    name: primary,
    address: secondary,
    latitude: Number(address.y),
    longitude: Number(address.x),
  }
}

/**
 * 키워드로 목적지 후보를 찾는다.
 *
 * 현재는 네이버 지도 JS SDK의 geocode(주소 검색)만 사용한다.
 * geocode는 **주소** 기준이라 "명동성당" 같은 POI 이름은 잡히지 않는다.
 *
 * TODO: 백엔드(Spring Boot)에 네이버 지역검색 프록시가 열리면
 *       이 함수 본문만 `GET /api/v1/places/search?query=` 호출로 교체한다.
 *       호출부는 Place[]만 알면 되므로 UI는 손대지 않아도 된다.
 */
export async function searchPlaces(
  query: string,
  options: { useEnglish?: boolean } = {},
): Promise<Place[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const sdk = await loadNaverMaps().catch(() => {
    throw new PlaceSearchError(SEARCH_ERROR.FAILED)
  })

  const response = await new Promise<naver.maps.Service.GeocodeResponse>(
    (resolve, reject) => {
      sdk.maps.Service.geocode(
        { query: trimmed, count: MAX_RESULTS },
        (status, result) => {
          if (status !== sdk.maps.Service.Status.OK) {
            reject(new PlaceSearchError(SEARCH_ERROR.FAILED))
            return
          }
          resolve(result)
        },
      )
    },
  )

  const places = response.v2.addresses
    .slice(0, MAX_RESULTS)
    .map((address) => toPlace(address, options.useEnglish ?? false))
    // 좌표가 비정상인 응답은 지도에 찍을 수 없으므로 버린다.
    .filter(
      (place) =>
        Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
    )

  if (places.length === 0) throw new PlaceSearchError(SEARCH_ERROR.NO_RESULT)

  return places
}
