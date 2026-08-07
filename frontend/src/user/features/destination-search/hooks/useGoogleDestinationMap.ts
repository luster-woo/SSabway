import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { IS_DEV } from '@/shared/lib/env'
import type { Place } from '@/shared/types/place'
import { findNearestPlace } from '@/user/features/destination-search/lib/searchGooglePlaces'
import {
  buildCandidateMarkerIcon,
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

/**
 * 두 지점을 "같은 자리"로 볼 오차(도 단위, 약 0.1m).
 *
 * 확정된 목적지는 sessionStorage 를 왕복하며 JSON 으로 굽혔다 펴진다. 값이
 * 바뀌지는 않지만, 좌표가 다른 경로(검색 결과 vs 저장본)로 들어와도 같은
 * 지점으로 인정하려면 정확히 일치를 요구하지 않는 편이 안전하다.
 */
const SAME_POINT_EPSILON = 1e-6

/** 지도에 찍을 지점 하나. Place 든 인근역이든 이 세 값만 있으면 된다. */
export interface MapPoint {
  name: string
  latitude: number
  longitude: number
}

function isSamePoint(a: MapPoint, b: MapPoint): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < SAME_POINT_EPSILON &&
    Math.abs(a.longitude - b.longitude) < SAME_POINT_EPSILON
  )
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
  /** 출발지 마커 옆에 붙일 짧은 말(예: "출발지"). 없으면 핀만 그린다. */
  originBadge?: string
  /** 도착지 마커 옆에 붙일 짧은 말(예: "목적지"). 없으면 핀만 그린다. */
  destinationBadge?: string
  /** 사용자의 현재 위치(표지판으로 인식한 역). null이면 내 위치 마커를 감춘다. */
  myLocation: { latitude: number; longitude: number } | null
  /**
   * 지도를 탭했을 때 그 지점을 후보로 넘긴다(검색 결과를 고른 것과 같은 흐름).
   * 없으면 지도 탭은 아무 일도 하지 않는다.
   */
  onPickPoint?: (place: Place) => void
}

export interface UseDestinationMapResult {
  mapRef: RefObject<google.maps.Map | null>
  /** 지도를 현재 위치(파란 점)로 다시 맞춘다. 좌표가 없으면 아무것도 안 한다. */
  recenterToMyLocation: () => void
}

/**
 * 컨테이너에 Google 지도를 띄우고 마커 넷을 관리한다.
 *   내 위치(파란 원) · 출발지(초록 핀) · 도착지(파란 핀) · 선택 중인 후보(주황 핀)
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
    originBadge,
    destinationBadge,
    myLocation,
    onPickPoint,
  }: UseDestinationMapOptions,
): UseDestinationMapResult {
  const mapRef = useRef<google.maps.Map | null>(null)
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null)
  const originMarkerRef = useRef<google.maps.Marker | null>(null)
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null)
  const myMarkerRef = useRef<google.maps.Marker | null>(null)
  /** 첫 렌더에서 한 번만 내 위치로 맞추기 위한 플래그. */
  const didCenterRef = useRef(false)
  /** 마지막으로 화면을 맞춰 준 후보의 placeId. 같은 후보로는 다시 안 움직인다. */
  const focusedPlaceIdRef = useRef<string | null>(null)
  /* 지도 생성은 한 번뿐이라, 최신 onPickPoint 를 ref 로 들고 리스너에서 읽는다. */
  const onPickRef = useRef(onPickPoint)
  useEffect(() => {
    onPickRef.current = onPickPoint
  }, [onPickPoint])

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

    /*
      지도를 탭하면 그 좌표를 후보로 잡는다 — 검색 결과를 고른 것과 같은 흐름이라
      하단 카드가 올라오고, [도착지로 설정]으로 그대로 확정할 수 있다.
      검색과 같은 Places API 로 가장 가까운 건물/장소명을 붙이고, 근처에 장소가
      없으면 좌표 문자열로 대체한다.
    */
    const clickListener = mapRef.current.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        const latLng = event.latLng
        if (!latLng || !onPickRef.current) return

        const latitude = latLng.lat()
        const longitude = latLng.lng()

        void findNearestPlace(latitude, longitude).then((place) => {
          const pick = onPickRef.current
          if (!pick) return
          pick(
            place ?? {
              placeId: `tap:${String(latitude)},${String(longitude)}`,
              name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              address: '',
              latitude,
              longitude,
            },
          )
        })
      },
    )

    const markerRefs = [
      selectedMarkerRef,
      originMarkerRef,
      destinationMarkerRef,
      myMarkerRef,
    ]

    return () => {
      google.maps.event.removeListener(clickListener)
      for (const ref of markerRefs) {
        ref.current?.setMap(null)
        ref.current = null
      }
      didCenterRef.current = false
      focusedPlaceIdRef.current = null
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
    // 라벨이 아이콘 안에 그려지므로 언어가 바뀌면 아이콘도 다시 만들어야 한다.
    const icon = buildOriginMarkerIcon(originBadge)

    if (originMarkerRef.current) {
      originMarkerRef.current.setPosition(position)
      originMarkerRef.current.setTitle(origin.name)
      originMarkerRef.current.setIcon(icon)
      originMarkerRef.current.setMap(map)
    } else {
      originMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: origin.name,
        icon,
        zIndex: 2,
      })
    }
  }, [isReady, origin, originBadge])

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
    const icon = buildDestinationMarkerIcon(destinationBadge)

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setPosition(position)
      destinationMarkerRef.current.setTitle(destination.name)
      destinationMarkerRef.current.setIcon(icon)
      destinationMarkerRef.current.setMap(map)
    } else {
      destinationMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: destination.name,
        icon,
        zIndex: 3,
      })
    }
  }, [isReady, destination, destinationBadge])

  /*
    선택 중인 후보 마커 — 아직 목적지로 확정하기 전 단계다.

    확정된 목적지와 색이 다르다(주황 vs 파랑). 뒤로가기로 이 화면에 돌아오면
    지난 목적지가 남아 있는데, 그 상태로 새 장소를 검색하면 두 지점이 동시에
    보이기 때문이다. 색이 같으면 어느 쪽이 확정된 목적지인지 알 수 없다.

    후보가 확정된 목적지 그 자체이면(= 돌아온 직후, 저장된 목적지를 그대로
    되살린 상태) 후보 마커를 아예 그리지 않는다. 같은 좌표에 핀 두 개가 겹쳐
    "마커가 2개"로 보이던 문제가 여기서 난다.
  */
  useEffect(() => {
    // 지도 생성 이펙트가 먼저 돌아야 하므로 isReady를 읽어 순서를 묶는다.
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!selected) {
      selectedMarkerRef.current?.setMap(null)
      selectedMarkerRef.current = null
      focusedPlaceIdRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: selected.latitude,
      lng: selected.longitude,
    }

    if (destination && isSamePoint(selected, destination)) {
      selectedMarkerRef.current?.setMap(null)
      selectedMarkerRef.current = null
    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setPosition(position)
      selectedMarkerRef.current.setTitle(selected.name)
      selectedMarkerRef.current.setMap(map)
    } else {
      selectedMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: selected.name,
        icon: buildCandidateMarkerIcon(),
        zIndex: 4,
      })
    }

    /*
      이동 후 확대. panTo(부드러운 이동) → setZoom 순서로 붙인다.
      후보가 실제로 바뀐 경우에만 — destination 이 바뀌어 이 이펙트가 다시 돌 때
      사용자가 둘러보던 화면을 되돌리지 않도록 마지막 대상 placeId 를 기억한다.
    */
    if (focusedPlaceIdRef.current !== selected.placeId) {
      focusedPlaceIdRef.current = selected.placeId
      map.panTo(position)
      map.setZoom(FOCUS_ZOOM)
    }
  }, [isReady, selected, destination])

  // "현재 위치로 이동" 버튼이 부른다. 마지막으로 받은 내 좌표로 지도를 다시 맞춘다.
  const recenterToMyLocation = useCallback(() => {
    const map = mapRef.current
    if (!map || !myLocation) return
    map.panTo({ lat: myLocation.latitude, lng: myLocation.longitude })
    map.setZoom(MY_LOCATION_ZOOM)
  }, [myLocation])

  return { mapRef, recenterToMyLocation }
}
