import type { Place } from '@/shared/types/place'
import { loadGoogleMaps } from '@/user/features/destination-search/lib/loadGoogleMaps'

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

function toPlace(result: google.maps.places.PlaceResult): Place | null {
  const location = result.geometry?.location
  if (!location) return null

  const name = (result.name ?? result.formatted_address ?? '').trim()
  if (!name) return null

  const address = (result.formatted_address ?? '').trim()

  return {
    // 같은 장소가 다른 표기로 두 번 내려와도 place_id 로 구분된다.
    placeId:
      result.place_id ?? `${String(location.lat())},${String(location.lng())}:${name}`,
    name,
    // 이름과 주소가 같으면(주소 검색 결과) 보조줄은 비운다.
    address: address === name ? '' : address,
    latitude: location.lat(),
    longitude: location.lng(),
  }
}

/**
 * 키워드로 목적지 후보를 찾는다.
 *
 * Google Places 의 Text Search 를 쓴다. 네이버 geocode(주소 전용)와 달리
 * "명동성당" 같은 POI 이름도 잡히고, 표기 언어는 SDK 로드 시점 언어를 따른다
 * (사용자가 시작 화면에서 고른 언어). 백엔드 프록시 없이 프론트에서 바로 검색한다.
 */
export async function searchPlaces(
  query: string,
  options: { language?: string } = {},
): Promise<Place[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  await loadGoogleMaps(options.language ?? 'ko').catch(() => {
    throw new PlaceSearchError(SEARCH_ERROR.FAILED)
  })

  // PlacesService 는 지도나 DOM 노드가 필요하다. 결과만 쓰므로 임시 노드를 넘긴다.
  const service = new google.maps.places.PlacesService(
    document.createElement('div'),
  )

  const results = await new Promise<google.maps.places.PlaceResult[]>(
    (resolve, reject) => {
      service.textSearch(
        { query: trimmed, language: options.language },
        (res, status) => {
          if (status === 'OK' && res) {
            resolve(res)
            return
          }
          if (status === 'ZERO_RESULTS') {
            reject(new PlaceSearchError(SEARCH_ERROR.NO_RESULT))
            return
          }
          reject(new PlaceSearchError(SEARCH_ERROR.FAILED))
        },
      )
    },
  )

  const places = results
    .slice(0, MAX_RESULTS)
    .map(toPlace)
    // 좌표가 없는(지도에 못 찍는) 응답은 버린다.
    .filter((place): place is Place => place !== null)

  if (places.length === 0) throw new PlaceSearchError(SEARCH_ERROR.NO_RESULT)

  return places
}
