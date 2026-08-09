import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { IS_DEV } from '@/shared/lib/env'
import type { Place } from '@/shared/types/place'
import { findNearestPlace } from '@/user/features/destination-search/lib/searchGooglePlaces'
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
  /**
   * 지금 고른 장소(아직 확정 전).
   *
   * 있으면 목적지 마커가 **이 자리로 옮겨 간다** — 별도의 후보 마커를 하나 더
   * 찍지 않는다. 검색이나 지도 탭은 "제3의 지점 추가"가 아니라 "목적지 다시
   * 고르기"이기 때문이다.
   */
  selected: Place | null
  /** 확정된 출발지. null이면 마커를 감춘다. */
  origin: MapPoint | null
  /** 확정된 도착지. selected 가 있으면 그쪽이 우선한다. 둘 다 null이면 감춘다. */
  destination: MapPoint | null
  /** 출발지 마커 옆에 붙일 짧은 말(예: "출발지"). 없으면 핀만 그린다. */
  originBadge?: string
  /** 목적지 마커 옆에 붙일 짧은 말(예: "목적지"). 없으면 핀만 그린다. */
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
  /**
   * 지정한 좌표로 화면을 맞춘다. null 이면 아무것도 안 한다.
   *
   * 구간 표시(출발지 → 도착지)에서 한쪽 이름을 눌렀을 때 그 핀을 보여주려고
   * 쓴다. selected 를 건드리지 않는 이유: 출발지를 보려고 눌렀을 뿐인데 그게
   * 목적지 후보로 바뀌면 안 된다.
   */
  focusPoint: (point: { latitude: number; longitude: number } | null) => void
}

/**
 * 컨테이너에 Google 지도를 띄우고 마커 셋을 관리한다.
 *   내 위치(파란 원) · 출발지(초록 핀) · 목적지(파란 핀)
 *
 * 목적지 핀은 항상 하나다. 사용자가 새 장소를 고르면 그 핀이 옮겨 가고 이전
 * 자리에는 아무것도 남지 않는다.
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

    const markerRefs = [originMarkerRef, destinationMarkerRef, myMarkerRef]

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

  /*
    목적지 마커 — 지도에 하나뿐이다.

    고르는 중인 후보(selected)가 있으면 그 자리를, 없으면 확정된 목적지를 가리킨다.
    후보용 마커를 따로 두지 않는 이유: 뒤로가기로 이 화면에 돌아오면 지난 목적지가
    남아 있는데, 그 상태에서 새 장소를 고르는 것은 "지점 하나 더 찍기"가 아니라
    "목적지 다시 고르기"다. 마커를 둘로 나누면 지도에 파란 핀 두 개가 남아 어느
    쪽이 지금의 목적지인지 알 수 없어진다.

    마커 객체는 재사용하고 위치만 옮긴다 — 그래서 이전 자리의 핀은 저절로 사라진다.
  */
  useEffect(() => {
    const map = isReady ? mapRef.current : null
    if (!map) return

    const target = selected ?? destination

    if (!target) {
      destinationMarkerRef.current?.setMap(null)
      destinationMarkerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: target.latitude,
      lng: target.longitude,
    }
    const icon = buildDestinationMarkerIcon(destinationBadge)

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setPosition(position)
      destinationMarkerRef.current.setTitle(target.name)
      destinationMarkerRef.current.setIcon(icon)
      destinationMarkerRef.current.setMap(map)
    } else {
      destinationMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: target.name,
        icon,
        zIndex: 3,
      })
    }
  }, [isReady, selected, destination, destinationBadge])

  /*
    고른 장소로 화면 맞추기. panTo(부드러운 이동) → setZoom 순서로 붙인다.

    후보가 실제로 바뀐 경우에만 움직인다 — 언어 전환처럼 다른 이유로 이펙트가
    다시 돌 때 사용자가 둘러보던 화면을 되돌리지 않도록 마지막 대상을 기억한다.
  */
  useEffect(() => {
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!selected) {
      focusedPlaceIdRef.current = null
      return
    }
    if (focusedPlaceIdRef.current === selected.placeId) return

    focusedPlaceIdRef.current = selected.placeId
    map.panTo({ lat: selected.latitude, lng: selected.longitude })
    map.setZoom(FOCUS_ZOOM)
  }, [isReady, selected])

  // "현재 위치로 이동" 버튼이 부른다. 마지막으로 받은 내 좌표로 지도를 다시 맞춘다.
  const recenterToMyLocation = useCallback(() => {
    const map = mapRef.current
    if (!map || !myLocation) return
    map.panTo({ lat: myLocation.latitude, lng: myLocation.longitude })
    map.setZoom(MY_LOCATION_ZOOM)
  }, [myLocation])

  /*
    임의의 지점으로 화면 맞추기. 후보를 고른 것과 같은 줌(FOCUS_ZOOM)을 써서,
    출발지를 봤다가 도착지를 보면 두 곳이 같은 배율로 보인다.

    focusedPlaceIdRef 를 비워 둔다: 이 함수로 카메라를 옮기면 화면은 더 이상
    고른 후보를 보고 있지 않다. 기억을 남겨 두면 이후 후보 쪽 이펙트가 "이미
    맞춰 준 후보"로 보고 건너뛰어, 목적지로 되돌아가야 할 때 지도가 안 움직인다.
  */
  const focusPoint = useCallback(
    (point: { latitude: number; longitude: number } | null) => {
      const map = mapRef.current
      if (!map || !point) return
      focusedPlaceIdRef.current = null
      map.panTo({ lat: point.latitude, lng: point.longitude })
      map.setZoom(FOCUS_ZOOM)
    },
    [],
  )

  return { mapRef, recenterToMyLocation, focusPoint }
}
