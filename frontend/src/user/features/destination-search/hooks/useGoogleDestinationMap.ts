import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { IS_DEV } from '@/shared/lib/env'
import type { Place } from '@/shared/types/place'
import {
  buildDestinationMarkerIcon,
  buildMyLocationIcon,
  buildOriginMarkerIcon,
} from '@/user/features/destination-search/lib/googleMarkerIcon'

/**
 * 지도 초기 화면 중심 — 대구역.
 *
 * 표지판으로 인식한 출발역이 있으면 그쪽으로 카메라가 맞춰지므로 이 값은
 * 폴백일 뿐이다. 지도 카메라의 출발점일 뿐, 경로 조회의 출발지가 아니다.
 */
const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 35.87565,
  lng: 128.5961,
}
const DEFAULT_ZOOM = 15
/** 지점을 고르면 건물이 구분되는 수준까지 당긴다. */
const FOCUS_ZOOM = 17
/** 내 위치로 맞출 때의 줌. */
const MY_LOCATION_ZOOM = 16

/** 지도에 찍을 지점 하나. Place 든 인근역이든 이 세 값만 있으면 된다. */
export interface MapPoint {
  name: string
  latitude: number
  longitude: number
}

export interface UseDestinationMapOptions {
  /** SDK 로딩이 끝났는지. false면 지도를 만들지 않는다. */
  isReady: boolean
  /** 목록에서 고른(아직 확정 전) 장소. null이면 마커를 감춘다. */
  selected: Place | null
  /** 확정된 출발지. null이면 마커를 감춘다. */
  origin: MapPoint | null
  /** 확정된 도착지. null이면 마커를 감춘다. */
  destination: MapPoint | null
  /** 사용자의 현재 위치(표지판으로 인식한 역). null이면 내 위치 마커를 감춘다. */
  myLocation: { latitude: number; longitude: number } | null
}

export interface UseDestinationMapResult {
  mapRef: RefObject<google.maps.Map | null>
  /** 지도를 현재 위치(파란 점)로 다시 맞춘다. 좌표가 없으면 아무것도 안 한다. */
  recenterToMyLocation: () => void
}

/**
 * 컨테이너에 Google 지도를 띄우고 마커 넷을 관리한다.
 *   내 위치(파란 원) · 출발지(파란 점) · 도착지(물방울 핀) · 선택 중인 후보
 *
 * 지도 인스턴스는 ref로만 들고 있는다 — state에 넣으면 지도 내부 상태가 바뀔 때마다
 * 리렌더가 돌면서 타일이 다시 그려진다.
 */
export function useGoogleDestinationMap(
  containerRef: RefObject<HTMLDivElement | null>,
  {
    isReady,
    selected,
    origin,
    destination,
    myLocation,
  }: UseDestinationMapOptions,
): UseDestinationMapResult {
  const mapRef = useRef<google.maps.Map | null>(null)
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null)
  const originMarkerRef = useRef<google.maps.Marker | null>(null)
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null)
  const myMarkerRef = useRef<google.maps.Marker | null>(null)
  /** 첫 렌더에서 한 번만 내 위치로 맞추기 위한 플래그. */
  const didCenterRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!isReady || !container || mapRef.current) return

    if (IS_DEV) {
      const { width, height } = container.getBoundingClientRect()
      // 컨테이너 크기가 0이면 지도는 생성돼도 아무것도 그려지지 않는다.
      console.info('[map] create', { width, height })
    }

    mapRef.current = new google.maps.Map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      // 모바일 화면이 좁아 기본 컨트롤이 검색창·바텀시트와 겹친다.
      disableDefaultUI: true,
      // POI 아이콘 클릭 시 뜨는 기본 정보창을 막는다 (우리 검색 흐름과 충돌).
      clickableIcons: false,
      // 한 손가락 드래그로 지도가 바로 움직이게 (모바일).
      gestureHandling: 'greedy',
    })

    const markerRefs = [
      selectedMarkerRef,
      originMarkerRef,
      destinationMarkerRef,
      myMarkerRef,
    ]

    return () => {
      for (const ref of markerRefs) {
        ref.current?.setMap(null)
        ref.current = null
      }
      didCenterRef.current = false
      // google.maps.Map 에는 destroy()가 없다. 컨테이너를 비우고 참조만 끊는다.
      mapRef.current = null
      container.replaceChildren()
    }
  }, [containerRef, isReady])

  /*
    "내 위치" 마커 — 표지판으로 인식한 출발역 좌표에 파란 원을 찍는다.

    화면 이동은 첫 좌표를 받은 순간 딱 한 번만 한다(didCenterRef). 매번 옮기면
    사용자가 지도를 둘러보는 중에 카메라가 되돌아와 조작이 튕긴다.
    좌표가 없으면(표지판 없이 직접 진입) 이 이펙트는 아무것도 하지 않고, 지도는
    생성 시의 DEFAULT_CENTER(대구역)에 머문다.
  */
  useEffect(() => {
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!myLocation) {
      myMarkerRef.current?.setMap(null)
      myMarkerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: myLocation.latitude,
      lng: myLocation.longitude,
    }

    if (myMarkerRef.current) {
      myMarkerRef.current.setPosition(position)
      myMarkerRef.current.setMap(map)
    } else {
      myMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: '내 위치',
        icon: buildMyLocationIcon(),
        // 다른 마커보다 아래에 깔리도록 낮게 둔다.
        zIndex: 1,
      })
    }

    if (!didCenterRef.current && !selected) {
      didCenterRef.current = true
      map.panTo(position)
      map.setZoom(MY_LOCATION_ZOOM)
    }
  }, [isReady, myLocation, selected])

  /* 확정된 출발지 마커 */
  useEffect(() => {
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!origin) {
      originMarkerRef.current?.setMap(null)
      originMarkerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: origin.latitude,
      lng: origin.longitude,
    }

    if (originMarkerRef.current) {
      originMarkerRef.current.setPosition(position)
      originMarkerRef.current.setTitle(origin.name)
      originMarkerRef.current.setMap(map)
    } else {
      originMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: origin.name,
        icon: buildOriginMarkerIcon(),
        zIndex: 2,
      })
    }
  }, [isReady, origin])

  /* 확정된 도착지 마커 */
  useEffect(() => {
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!destination) {
      destinationMarkerRef.current?.setMap(null)
      destinationMarkerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: destination.latitude,
      lng: destination.longitude,
    }

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setPosition(position)
      destinationMarkerRef.current.setTitle(destination.name)
      destinationMarkerRef.current.setMap(map)
    } else {
      destinationMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: destination.name,
        icon: buildDestinationMarkerIcon(),
        zIndex: 3,
      })
    }
  }, [isReady, destination])

  /*
    선택 중인 후보 마커 — 아직 출발/도착으로 지정하기 전 단계다.
    고르는 즉시 그 위치로 화면을 맞춘다.
  */
  useEffect(() => {
    // 지도 생성 이펙트가 먼저 돌아야 하므로 isReady를 읽어 순서를 묶는다.
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!selected) {
      selectedMarkerRef.current?.setMap(null)
      selectedMarkerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: selected.latitude,
      lng: selected.longitude,
    }

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setPosition(position)
      selectedMarkerRef.current.setMap(map)
    } else {
      selectedMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: selected.name,
        icon: buildDestinationMarkerIcon(),
        zIndex: 4,
      })
    }

    // 이동 후 확대. panTo(부드러운 이동) → setZoom 순서로 붙인다.
    map.panTo(position)
    map.setZoom(FOCUS_ZOOM)
  }, [isReady, selected])

  // "현재 위치로 이동" 버튼이 부른다. 마지막으로 받은 내 좌표로 지도를 다시 맞춘다.
  const recenterToMyLocation = useCallback(() => {
    const map = mapRef.current
    if (!map || !myLocation) return
    map.panTo({ lat: myLocation.latitude, lng: myLocation.longitude })
    map.setZoom(MY_LOCATION_ZOOM)
  }, [myLocation])

  return { mapRef, recenterToMyLocation }
}
