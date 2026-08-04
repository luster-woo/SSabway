import { useCallback, useState } from 'react'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import { useOriginStationStore } from '@/shared/lib/store/useOriginStationStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import { openviduApi } from '@/user/features/consultation/openviduApi'

export interface UseConsultationRequestResult {
  /**
   * 상담을 요청하고 consultationId 를 돌려준다.
   * 실패하면(경로 정보 없음, 중복 요청 409, 블랙리스트 403 등) null.
   */
  requestConsultation: () => Promise<number | null>
  /**
   * 대기 취소. WAITING 이 아니게 됐거나(이미 매칭) 이미 취소됐어도 조용히
   * 넘어간다 — 화면은 이 호출 결과와 무관하게 로컬 대기 상태만 되돌리면 된다.
   */
  cancelConsultation: (consultationId: number) => Promise<void>
  isPending: boolean
  /** 403 BLACKLISTED 등으로 요청이 거절됐다 */
  isRejected: boolean
  /**
   * 출발지·목적지를 몰라서 요청을 보낼 수조차 없다.
   *
   * 정상 흐름(경로 선택 → 경로 안내 → 도움 요청)에서는 선택 경로가 차 있다.
   * 이 화면에 URL 로 직접 들어왔거나, 세션이 만료돼 스토어가 비었을 때
   * true 가 된다.
   */
  isRouteMissing: boolean
}

/**
 * 상담 요청 — 대기열 등록 + 취소.
 *
 * 요청 본문의 출발지·목적지는 **사용자가 고른 경로의 역 이름**을 쓴다
 * (`useSelectedRouteStore`). 서버가 departure 로 담당 역무원을 배정하는데
 * (8/4 — departureStationId 삭제) `stations.name_ko` 와 정확 비교이므로,
 * Google Places 가 준 장소명("경북대 북문")이 아니라 ODsay 가 준 역 이름이어야
 * 한다. destination 도 같은 이유로 도착역을 보낸다 — 역무원 화면에 표시되는
 * 구간이 사용자가 실제로 타는 구간과 같아야 한다.
 *
 * 경로를 고르기 전(URL 직접 진입, 세션 만료)에는 출발지·목적지 스토어의
 * 이름으로 폴백한다. 그마저 없으면 요청 자체를 보내지 않는다(isRouteMissing).
 *
 * ⚠️ TODO(BE 답변 대기): ODsay 역 표기와 DB 시드 표기가 다르면 여전히
 *    404 STAFF_NOT_FOUND 다("대구역" vs "대구"). BE 가 시드의 역 이름 표기를
 *    확정하면 여기서 매핑(또는 정규화)을 넣는다.
 *
 * TODO: 블랙리스트 403 은 이제 응답의 code(CONSULTATION_BLOCKED)로 구분
 *       가능하다(ssabway ApiResponse 에 code 추가됨). 화면 문구 분기는 별도
 *       작업으로 남긴다.
 */
export function useConsultationRequest(): UseConsultationRequestResult {
  const [isPending, setIsPending] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)
  const originStation = useOriginStationStore((state) => state.originStation)
  const destination = useDestinationStore((state) => state.destination)

  const departure =
    selectedRoute?.departureStation ?? originStation?.name ?? null
  const arrival = selectedRoute?.arrivalStation ?? destination?.name ?? null
  const isRouteMissing = departure === null || arrival === null

  const requestConsultation = useCallback(async (): Promise<number | null> => {
    // 필수 필드가 비면 서버가 400 을 줄 뿐이라 요청 자체를 보내지 않는다.
    if (departure === null || arrival === null) return null

    setIsPending(true)
    setIsRejected(false)

    try {
      // 서버가 trim 후 정확 비교하므로 이쪽에서도 미리 다듬어 보낸다.
      const created = await openviduApi.requestConsultation({
        departure: departure.trim(),
        destination: arrival.trim(),
      })
      return created.consultationId
    } catch {
      setIsRejected(true)
      return null
    } finally {
      setIsPending(false)
    }
  }, [arrival, departure])

  const cancelConsultation = useCallback(
    async (consultationId: number): Promise<void> => {
      try {
        await openviduApi.cancelConsultation(consultationId)
      } catch {
        // 최선형 호출이다. 취소 시점에 이미 매칭돼 있어 서버가 거절(409)해도
        // 사용자 화면은 어차피 로컬 대기 상태만 되돌리면 되므로 흡수한다.
      }
    },
    [],
  )

  return {
    requestConsultation,
    cancelConsultation,
    isPending,
    isRejected,
    isRouteMissing,
  }
}
