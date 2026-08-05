import { useCallback, useState } from 'react'

import { useCurrentNodeStore } from '@/shared/lib/store/useCurrentNodeStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import {
  resolveStationNodes,
  useStationNodeStore,
} from '@/shared/lib/store/useStationNodeStore'
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
   * 출발역 정보를 몰라서 요청을 보낼 수조차 없다.
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
 * 요청 본문 앞의 세 값은 모두 **사용자가 고른 경로**에서 나온다
 * (`useSelectedRouteStore`).
 *   stationId     ← segments[0].stationId — 서버가 이 id 로 역무원을 배정한다 (8/5 추가)
 *   departure     ← firstStartStationKor
 *   destination   ← lastEndStationKor
 *   currentNodeId ← 경로 상세 안내에서 마지막으로 보고 있던 단계의 from
 *                   (`useCurrentNodeStore`, 8/5 추가). 역무원이 이 노드로
 *                   사용자 위치를 지도에 띄운다. 상세 안내를 열어 본 적이
 *                   없으면 역 내 출발 노드로 폴백한다 — "아직 출발 지점에
 *                   있다"가 위치를 아예 안 보내는 것보다 진실에 가깝고,
 *                   필수 필드라 비워 보내면 400 이다.
 *
 * ⚠️ 역 이름은 **한국어 표기**여야 한다. 서버가 `stations.name_ko` 와 정확
 *    비교하므로(StaffRepository.findByDepartureStationName), 화면에 뿌리는
 *    번역 표기("Daegu Station")를 보내면 외국어 사용자만 404 로 실패한다.
 *
 * 8/5 부터 출발지·목적지 스토어의 장소명 폴백은 없앴다. stationId 를 대체할
 * 출처가 없어서, 이름만 채워 보내면 어차피 400 이기 때문이다. 경로를 고르기
 * 전이면 요청을 보내지 않고 화면이 안내한다(isRouteMissing).
 *
 * ⚠️ TODO(BE 답변 대기): ODsay 역 표기와 DB 시드 표기가 다르면 여전히
 *    404 STAFF_NOT_FOUND 다("대구역" vs "대구"). stationId 가 추가돼 배정
 *    자체는 id 로 될 가능성이 있으나, 이름 비교가 남아 있다면 여기서 매핑을
 *    넣어야 한다 — BE 가 확정하면 정리할 것.
 *
 * TODO: 블랙리스트 403 은 이제 응답의 code(CONSULTATION_BLOCKED)로 구분
 *       가능하다(ssabway ApiResponse 에 code 추가됨). 화면 문구 분기는 별도
 *       작업으로 남긴다.
 */
export function useConsultationRequest(): UseConsultationRequestResult {
  const [isPending, setIsPending] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)

  /*
    현재 위치 노드 — 상세 안내에서 보고 있던 단계의 from. 열어 본 적 없으면
    null 이라, 역 내 경로의 출발 노드(인식 결과 또는 파일럿 기본값)로 폴백한다.
    폴백 규칙은 resolveStationNodes 한 곳에 있다 (navi 요청과 같은 규칙).
  */
  const storedNodeId = useCurrentNodeStore((state) => state.currentNodeId)
  const startPoint = useStationNodeStore((state) => state.startPoint)
  const finalPoint = useStationNodeStore((state) => state.finalPoint)
  const currentNodeId =
    storedNodeId ?? resolveStationNodes({ startPoint, finalPoint }).startPoint

  /*
    세 값 모두 선택한 경로에서만 나온다.

    stationId 는 경로 제공 응답에만 있고 대체할 출처가 없어서, 예전처럼
    출발지·목적지 스토어의 장소명으로 폴백할 수 없다 — 이름만 채워 보내면
    stationId 가 빠져 400 이다. 경로를 고르지 않았으면 요청을 아예 막고
    화면이 안내하게 한다(isRouteMissing).

    역 이름은 **한국어 표기**를 쓴다. 화면에 뿌리는 departureStation 은 사용자
    언어로 번역된 값이라 서버의 `stations.name_ko` 비교에서 어긋난다.
  */
  const stationId = selectedRoute?.stationId ?? null
  const departure = selectedRoute?.departureStationKor ?? null
  const arrival = selectedRoute?.arrivalStationKor ?? null
  const isRouteMissing =
    stationId === null || departure === null || arrival === null

  const requestConsultation = useCallback(async (): Promise<number | null> => {
    // 필수 필드가 비면 서버가 400 을 줄 뿐이라 요청 자체를 보내지 않는다.
    if (stationId === null || departure === null || arrival === null) {
      return null
    }

    setIsPending(true)
    setIsRejected(false)

    try {
      // 서버가 trim 후 정확 비교하므로 이쪽에서도 미리 다듬어 보낸다.
      const created = await openviduApi.requestConsultation({
        stationId,
        departure: departure.trim(),
        destination: arrival.trim(),
        currentNodeId,
      })
      return created.consultationId
    } catch {
      setIsRejected(true)
      return null
    } finally {
      setIsPending(false)
    }
  }, [arrival, currentNodeId, departure, stationId])

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
