import { useEffect, useState } from 'react'

import {
  LOCATION_CONSENT,
  useLocationConsentStore,
} from '@/shared/lib/store/useLocationConsentStore'
import {
  requestLocation,
  type Coords,
} from '@/user/features/start/lib/requestLocation'

/**
 * 위치 동의(GRANTED)가 돼 있으면 현재 좌표를 한 번 받아온다. 아니면 null.
 * 도착지 지도에 "내 위치" 마커를 찍기 위해 쓴다.
 *
 * 좌표 획득 로직은 시작 화면이 쓰는 requestLocation 을 그대로 재사용한다
 * (실패·거부·타임아웃은 전부 null 로 돌아오므로 지도는 마커만 감추면 된다).
 */
export function useMyLocation(enabled: boolean): Coords | null {
  const consent = useLocationConsentStore((state) => state.consent)
  const [coords, setCoords] = useState<Coords | null>(null)

  useEffect(() => {
    if (!enabled || consent !== LOCATION_CONSENT.GRANTED) {
      setCoords(null)
      return
    }

    // 언마운트 이후 늦게 도착한 좌표가 setState 를 호출하지 않도록 막는다.
    let alive = true
    void requestLocation().then((result) => {
      if (alive) setCoords(result)
    })

    return () => {
      alive = false
    }
  }, [enabled, consent])

  return coords
}
