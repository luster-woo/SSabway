import type { NearestStation } from '@/shared/types/station'
import { loadGoogleMaps } from '@/user/features/destination-search/lib/loadGoogleMaps'
import type { Coords } from '@/user/features/start/lib/requestLocation'

/**
 * 역으로 인정할 Google Places 장소 유형.
 *
 * subway_station     : 지하철역
 * train_station      : 일반·광역철도역 (대경선·동해선 등 — 지하철로만 검색하면 놓친다)
 * light_rail_station : 경전철역 (부산김해경전철, 대구 3호선 등)
 *
 * nearbySearch 는 요청당 유형 하나만 받으므로 유형별로 조회한 뒤 합쳐서 고른다.
 */
const STATION_TYPES = [
  'subway_station',
  'train_station',
  'light_rail_station',
] as const

/** 두 좌표 사이 대략 거리(m). 최근접 비교용이라 하버사인 근사면 충분하다. */
function distanceMeters(a: Coords, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.latitude)
  const dLng = toRad(b.lng - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 한 장소 유형에 대해 거리순 최근접 결과를 받는다. (실패·0건은 빈 배열) */
function nearbyByType(
  service: google.maps.places.PlacesService,
  coords: Coords,
  type: string,
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve, reject) => {
    service.nearbySearch(
      {
        location: { lat: coords.latitude, lng: coords.longitude },
        // 거리순 정렬. radius 를 함께 주면 안 되므로 rankBy 만 쓴다.
        rankBy: google.maps.places.RankBy.DISTANCE,
        type,
      },
      (res, status) => {
        if (status === 'OK' && res) {
          resolve(res)
          return
        }
        if (status === 'ZERO_RESULTS') {
          resolve([])
          return
        }
        reject(new Error(`nearby ${type} search failed: ${status}`))
      },
    )
  })
}

/**
 * 좌표에서 가장 가까운 역(이름 + 좌표)을 Google Places 로 찾는다. (프론트 전용)
 *
 * 지하철역뿐 아니라 광역전철·경전철역(대경선·동해선 등)까지 포함해, 유형별로
 * 가장 가까운 후보를 받은 뒤 그중 실제로 제일 가까운 하나를 고른다.
 *
 * 좌표까지 돌려주는 이유: 목적지 지도의 "내 위치(파란 원)"를 사용자의 원좌표가 아니라
 * 찾은 역의 위치에 찍기 위해서다.
 *
 * 못 찾거나 실패하면 null 을 돌려준다 — 역 정보는 부가 정보라, 호출부는
 * null 이면 표시를 감추기만 하면 된다.
 */
export async function findNearestStation(
  coords: Coords,
  options: { language?: string } = {},
): Promise<NearestStation | null> {
  await loadGoogleMaps(options.language ?? 'ko')

  // PlacesService 는 지도나 DOM 노드가 필요하다. 결과만 쓰므로 임시 노드를 넘긴다.
  const service = new google.maps.places.PlacesService(
    document.createElement('div'),
  )

  // 한 유형이 실패해도 나머지로 답을 낼 수 있게 개별 실패는 빈 배열로 흘린다.
  const perType = await Promise.all(
    STATION_TYPES.map((type) =>
      nearbyByType(service, coords, type).catch(() => []),
    ),
  )

  // 유형별 최근접(각 배열의 첫 항목) 중에서 실제 거리로 가장 가까운 역을 고른다.
  let best: { station: NearestStation; dist: number } | null = null
  for (const results of perType) {
    const top = results[0]
    const location = top?.geometry?.location
    const name = top?.name?.trim()
    if (!location || !name) continue

    const latitude = location.lat()
    const longitude = location.lng()
    const dist = distanceMeters(coords, { lat: latitude, lng: longitude })
    if (!best || dist < best.dist) {
      best = { station: { name, latitude, longitude }, dist }
    }
  }

  return best ? best.station : null
}
