import { useEffect, useRef, type RefObject } from 'react'

import { IS_DEV } from '@/shared/lib/env'
import type { Place } from '@/shared/types/place'
import { buildDestinationMarkerIcon } from '@/user/features/destination-search/lib/markerIcon'

/** 파일럿 대상인 대구역. 목적지를 고르기 전 초기 화면의 중심이다. */
export const DEFAULT_CENTER = { latitude: 35.87961, longitude: 128.59276 }
const DEFAULT_ZOOM = 15
/** 목적지를 고르면 건물이 구분되는 수준까지 당긴다. */
const FOCUS_ZOOM = 17
const MORPH_MS = 500

export interface UseDestinationMapOptions {
  /** SDK 로딩이 끝났는지. false면 지도를 만들지 않는다. */
  isReady: boolean
  /** 선택된 목적지. null이면 마커를 감춘다. */
  selected: Place | null
}

/**
 * 컨테이너에 네이버 지도를 띄우고, 선택된 목적지에 마커를 찍은 뒤 그 위치로 이동한다.
 *
 * 지도 인스턴스는 ref로만 들고 있는다 — state에 넣으면 지도 내부 상태가 바뀔 때마다
 * 리렌더가 돌면서 타일이 다시 그려진다.
 */
export function useDestinationMap(
  containerRef: RefObject<HTMLDivElement | null>,
  { isReady, selected }: UseDestinationMapOptions,
) {
  const mapRef = useRef<naver.maps.Map | null>(null)
  const markerRef = useRef<naver.maps.Marker | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!isReady || !container || mapRef.current) return

    if (IS_DEV) {
      const { width, height } = container.getBoundingClientRect()
      // 컨테이너 크기가 0이면 지도는 생성돼도 아무것도 그려지지 않는다.
      console.info('[map] create', { width, height })
    }

    mapRef.current = new naver.maps.Map(container, {
      center: new naver.maps.LatLng(
        DEFAULT_CENTER.latitude,
        DEFAULT_CENTER.longitude,
      ),
      zoom: DEFAULT_ZOOM,
      // 모바일 화면이 좁아 기본 컨트롤이 검색창·바텀시트와 겹친다.
      zoomControl: false,
      mapDataControl: false,
      scaleControl: false,
    })

    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [containerRef, isReady])

  useEffect(() => {
    // 지도 생성 이펙트가 먼저 돌아야 하므로 isReady를 읽어 순서를 묶는다.
    const map = isReady ? mapRef.current : null
    if (!map) return

    if (!selected) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      return
    }

    const position = new naver.maps.LatLng(
      selected.latitude,
      selected.longitude,
    )

    if (markerRef.current) {
      markerRef.current.setPosition(position)
      markerRef.current.setMap(map)
    } else {
      markerRef.current = new naver.maps.Marker({
        position,
        map,
        title: selected.name,
        icon: buildDestinationMarkerIcon(),
      })
    }

    // morph는 이동 + 줌을 한 번에 처리한다. setCenter/setZoom을 따로 부르면
    // 중간 줌 레벨의 타일까지 받아와서 깜빡인다.
    map.morph(position, FOCUS_ZOOM, { duration: MORPH_MS })
  }, [isReady, selected])

  return mapRef
}
