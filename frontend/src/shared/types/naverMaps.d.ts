/**
 * 네이버 지도 JS API v3 앰비언트 타입.
 *
 * 공식 @types 패키지가 없어 이 프로젝트에서 실제로 쓰는 범위만 선언한다.
 * 새 API를 쓰게 되면 여기에 시그니처를 추가할 것. (any 남발 금지)
 */
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  class Point {
    constructor(x: number, y: number)
  }

  class Size {
    constructor(width: number, height: number)
  }

  interface MapOptions {
    center?: LatLng
    zoom?: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    mapDataControl?: boolean
    scaleControl?: boolean
    logoControl?: boolean
  }

  interface TransitionOptions {
    duration?: number
    easing?: string
  }

  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions)
    setCenter(latlng: LatLng): void
    setZoom(zoom: number, transition?: boolean): void
    /** 이동과 확대를 한 번의 애니메이션으로 처리한다. */
    morph(
      latlng: LatLng,
      zoom?: number,
      transitionOptions?: TransitionOptions,
    ): void
    panTo(latlng: LatLng, transitionOptions?: TransitionOptions): void
    getZoom(): number
    refresh(noEffect?: boolean): void
    destroy(): void
  }

  interface MarkerIcon {
    content?: string
    url?: string
    size?: Size
    anchor?: Point
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map | null
    title?: string
    icon?: MarkerIcon
    zIndex?: number
  }

  class Marker {
    constructor(options: MarkerOptions)
    setPosition(latlng: LatLng): void
    setMap(map: Map | null): void
    getPosition(): LatLng
  }

  namespace Service {
    const Status: { OK: string; ERROR: string }

    interface GeocodeAddressElement {
      types: string[]
      longName: string
      shortName: string
      code: string
    }

    interface GeocodeAddress {
      roadAddress: string
      jibunAddress: string
      englishAddress: string
      /** 경도. 문자열로 내려온다. */
      x: string
      /** 위도. 문자열로 내려온다. */
      y: string
      distance: number
      addressElements: GeocodeAddressElement[]
    }

    interface GeocodeResponse {
      v2: {
        status: string
        meta: { totalCount: number; page: number; count: number }
        addresses: GeocodeAddress[]
        errorMessage?: string
      }
    }

    function geocode(
      options: {
        query: string
        coordinate?: string
        page?: number
        count?: number
      },
      callback: (status: string, response: GeocodeResponse) => void,
    ): void
  }
}

interface Window {
  naver?: typeof naver
  /** 키·도메인 인증 실패 시 네이버 SDK가 호출하는 전역 콜백. */
  navermap_authFailure?: () => void
}
