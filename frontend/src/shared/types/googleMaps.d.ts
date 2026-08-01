/**
 * Google Maps JS API 앰비언트 타입.
 *
 * 공식 @types/google.maps 패키지 대신, 이 프로젝트에서 실제로 쓰는 범위만 선언한다.
 * (devDependency·package-lock 을 건드리지 않기 위함)
 * 새 API를 쓰게 되면 여기에 시그니처를 추가할 것. (any 남발 금지)
 *
 * ⚠️ window.google 은 이미 shared/types/google.d.ts 가 Google 로그인(GIS)용으로
 *    선언한다. 충돌을 피하려고 여기서는 window.google 을 다시 선언하지 않고,
 *    전역 `google.maps` 네임스페이스만 선언한다. 지도 코드는 이 전역을 직접 쓴다.
 */
declare namespace google.maps {
  class LatLng {
    lat(): number
    lng(): number
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  class Point {
    constructor(x: number, y: number)
  }

  class Size {
    constructor(width: number, height: number)
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral
    zoom?: number
    /** 기본 UI(줌·지도유형·스트리트뷰·전체화면 버튼)를 한 번에 끈다. */
    disableDefaultUI?: boolean
    clickableIcons?: boolean
    gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto'
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions)
    setCenter(latlng: LatLng | LatLngLiteral): void
    setZoom(zoom: number): void
    panTo(latlng: LatLng | LatLngLiteral): void
    getZoom(): number | undefined
  }

  interface Icon {
    url: string
    scaledSize?: Size
    anchor?: Point
  }

  interface MarkerOptions {
    position: LatLng | LatLngLiteral
    map?: Map | null
    title?: string
    icon?: string | Icon
    zIndex?: number
  }

  class Marker {
    constructor(options?: MarkerOptions)
    setPosition(latlng: LatLng | LatLngLiteral): void
    setMap(map: Map | null): void
    getPosition(): LatLng | undefined
  }

  namespace places {
    /** textSearch 콜백이 돌려주는 상태 문자열. 실제 런타임 값이 이 문자열과 같다. */
    type PlacesServiceStatus =
      | 'OK'
      | 'ZERO_RESULTS'
      | 'OVER_QUERY_LIMIT'
      | 'REQUEST_DENIED'
      | 'INVALID_REQUEST'
      | 'NOT_FOUND'
      | 'UNKNOWN_ERROR'

    interface PlaceGeometry {
      location?: LatLng
    }

    interface PlaceResult {
      name?: string
      formatted_address?: string
      place_id?: string
      geometry?: PlaceGeometry
    }

    interface TextSearchRequest {
      query: string
      language?: string
      region?: string
    }

    class PlacesService {
      constructor(attrContainer: HTMLElement | Map)
      textSearch(
        request: TextSearchRequest,
        callback: (
          results: PlaceResult[] | null,
          status: PlacesServiceStatus,
        ) => void,
      ): void
    }
  }
}

interface Window {
  /** 키·도메인(리퍼러) 인증 실패 시 Google Maps SDK가 호출하는 전역 콜백. */
  gm_authFailure?: () => void
}
