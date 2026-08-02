import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { IS_DEV } from '@/shared/lib/env'
import type { Place } from '@/shared/types/place'
import {
  buildDestinationMarkerIcon,
  buildMyLocationIcon,
} from '@/user/features/destination-search/lib/googleMarkerIcon'

/** 파일럿 대상인 대구역. 목적지도 내 위치도 없을 때의 초기 화면 중심이다. */
const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 35.87961,
  lng: 128.59276,
}
const DEFAULT_ZOOM = 15
/** 목적지를 고르면 건물이 구분되는 수준까지 당긴다. */
const FOCUS_ZOOM = 17
/** 내 위치로 맞출 때의 줌. */
const MY_LOCATION_ZOOM = 16

export interface UseDestinationMapOptions {
  /** SDK 로딩이 끝났는지. false면 지도를 만들지 않는다. */
  isReady: boolean
  /** 선택된 목적지. null이면 목적지 마커를 감춘다. */
  selected: Place | null
  /** GPS 동의 시 사용자의 현재 좌표. null이면 내 위치 마커를 감춘다. */
  myLocation: { latitude: number; longitude: number } | null
}

export interface UseDestinationMapResult {
  mapRef: RefObject<google.maps.Map | null>
  /** 지도를 현재 위치(파란 점)로 다시 맞춘다. 좌표가 없으면 아무것도 안 한다. */
  recenterToMyLocation: () => void
}

/**
 * 컨테이너에 Google 지도를 띄우고, 선택된 목적지 마커와 "내 위치" 마커를 관리한다.
 *
 * 지도 인스턴스는 ref로만 들고 있는다 — state에 넣으면 지도 내부 상태가 바뀔 때마다
 * 리렌더가 돌면서 타일이 다시 그려진다.
 */
export function useGoogleDestinationMap(
  containerRef: RefObject<HTMLDivElement | null>,
  { isReady, selected, myLocation }: UseDestinationMapOptions,
): UseDestinationMapResult {
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const myMarkerRef = useRef<google.maps.Marker | null>(null)

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

    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
      myMarkerRef.current?.setMap(null)
      myMarkerRef.current = null
      // google.maps.Map 에는 destroy()가 없다. 컨테이너를 비우고 참조만 끊는다.
      mapRef.current = null
      container.replaceChildren()
    }
  }, [containerRef, isReady])

  // "내 위치" 마커: GPS 동의로 좌표를 받으면 파란 점(원)을 찍는다.
  // 아직 목적지를 안 골랐으면 내 위치로 화면을 맞춰 사용자가 자기 위치를 보게 한다.
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
        // 목적지 마커(zIndex 미설정=기본)보다 아래에 깔리도록 낮게 둔다.
        zIndex: 1,
      })
    }

    // 목적지를 아직 안 골랐을 때만 내 위치로 이동한다.
    // (목적지를 고른 뒤에는 아래 목적지 이펙트가 그쪽으로 화면을 맞춘다.)
    if (!selected) {
      map.panTo(position)
      map.setZoom(MY_LOCATION_ZOOM)
    }
  }, [isReady, myLocation, selected])

  // 목적지 마커: 선택된 목적지에 물방울 마커를 찍고 그 위치로 이동·확대한다.
  useEffect(() => {
    // 지도 생성 이펙트가 먼저 돌아야 하므로 isReady를 읽어 순서를 묶는다.
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!selected) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: selected.latitude,
      lng: selected.longitude,
    }

    if (markerRef.current) {
      markerRef.current.setPosition(position)
      markerRef.current.setMap(map)
    } else {
      markerRef.current = new google.maps.Marker({
        position,
        map,
        title: selected.name,
        icon: buildDestinationMarkerIcon(),
      })
    }

    // 이동 후 확대. panTo(부드러운 이동) → setZoom 순서로 목적지에 붙인다.
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
