import { useCallback, useState } from 'react'

import { useLanguage } from '@/shared/lib/useLanguage'
import type { NearestStation } from '@/shared/types/station'
import { findNearestStation } from '@/user/features/start/lib/findNearestStation'
import type { Coords } from '@/user/features/start/lib/requestLocation'

/**
 * 좌표로 가까운 역을 찾는다.
 *
 * "가까운 역" 표시는 백엔드에 맡기지 않고 프론트에서 외부 API로 직접 처리한다.
 * Google Places(목적지 검색과 같은 SDK)의 nearbySearch 로 실제 좌표 기준
 * 최근접 역을 찾는다. (findNearestStation)
 *
 * 이름과 좌표를 함께 들고 있는다 — 이름은 시작 화면 표시에, 좌표는 목적지 지도의
 * "내 위치(파란 원)"를 그 역 위치에 찍는 데 쓴다.
 *
 * 정확도는 좌표 품질에 좌우되므로, 시작 페이지는 이 조회에 쓸 좌표를
 * 고정밀(highAccuracy)로 받는다. (StartPage.allowLocation)
 */

export interface UseNearbyStationResult {
  /** 조회 전이거나 실패했으면 null */
  station: NearestStation | null
  isPending: boolean
  findStation: (coords: Coords) => Promise<void>
  clear: () => void
}

/**
 * 「동의」 를 누른 순간 한 번 나가는 명령이라 useQuery 가 아닌 useState 로 둔다.
 *
 * 실패해도 오류 문구를 띄우지 않는다. 역 정보는 안내를 돕는 부가 정보이고,
 * 못 받아도 사용자는 표지판 촬영으로 그대로 진행할 수 있기 때문이다.
 */
export function useNearbyStation(): UseNearbyStationResult {
  // 역 표기 언어를 사용자가 고른 언어에 맞춘다 (Google SDK 로드 언어로 전달).
  const { language } = useLanguage()
  const [station, setStation] = useState<NearestStation | null>(null)
  const [isPending, setIsPending] = useState(false)

  const findStation = useCallback(
    async (coords: Coords) => {
      setIsPending(true)
      // 이전 좌표로 찾은 역이 새 결과가 올 때까지 남아 있으면 안 된다.
      setStation(null)

      try {
        setStation(await findNearestStation(coords, { language }))
      } catch {
        setStation(null)
      } finally {
        setIsPending(false)
      }
    },
    [language],
  )

  const clear = useCallback(() => setStation(null), [])

  return { station, isPending, findStation, clear }
}
