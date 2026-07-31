import { useCallback, useState } from 'react'

import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'
import type { Coords } from '@/user/features/start/lib/requestLocation'

/**
 * 좌표로 가까운 역을 조회한다. (명세: GPS 기반 근처 역 반환)
 *
 * `GET /routes/gps?latitude=..&longitude=..` → `{ station }`
 * 명세에 적힌 상태코드는 200 / 400 두 개뿐이라 성공·실패만 구분한다.
 *
 * ⚠️ userApi 가 아니라 publicApi 를 쓴다. 시작 페이지는 비로그인도 쓰는
 *    화면인데, userApi 의 인터셉터는 401 을 받으면 토큰 재발급을 시도하고
 *    실패하면 로그인 화면으로 리다이렉트한다. 즉 로그인하지 않은 사용자가
 *    「동의」 를 누른 것만으로 화면이 통째로 로그인으로 넘어가 버린다.
 *
 * ⚠️ BE 「개발전」 이라 지금은 MSW 목이 응답한다. 목을 끄면 404 가 나고
 *    화면은 역 이름 없이 동의 상태만 보여준다 — 안내 흐름은 막히지 않는다.
 */
async function requestNearbyStation(coords: Coords): Promise<string> {
  const res = await publicApi.get<ApiResponse<{ station: string }>>(
    endpoints.routes.nearbyByGps(coords.latitude, coords.longitude),
  )
  return res.data.data.station
}

export interface UseNearbyStationResult {
  /** 조회 전이거나 실패했으면 null */
  station: string | null
  isPending: boolean
  findStation: (coords: Coords) => Promise<void>
  clear: () => void
}

/**
 * 서버에서 읽어오지만 선언형 구독이 아니라 「동의」 를 누른 순간 한 번 나가는
 * 명령이라 useQuery 가 아닌 useState 로 둔다. (useEmailAvailability 와 같은 형태)
 *
 * 실패해도 오류 문구를 띄우지 않는다. 역 이름은 안내를 돕는 부가 정보이고,
 * 못 받아도 사용자는 표지판 촬영으로 그대로 진행할 수 있기 때문이다.
 */
export function useNearbyStation(): UseNearbyStationResult {
  const [station, setStation] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const findStation = useCallback(async (coords: Coords) => {
    setIsPending(true)
    // 이전 좌표로 찾은 역이 새 결과가 올 때까지 남아 있으면 안 된다.
    setStation(null)

    try {
      setStation(await requestNearbyStation(coords))
    } catch {
      setStation(null)
    } finally {
      setIsPending(false)
    }
  }, [])

  const clear = useCallback(() => setStation(null), [])

  return { station, isPending, findStation, clear }
}
