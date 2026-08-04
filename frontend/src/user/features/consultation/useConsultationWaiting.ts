import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { CONSULTATION_STATUS, type ConsultationStatus } from '@/shared/types'
import { openviduApi } from '@/user/features/consultation/openviduApi'

/** 상태 폴링 간격. useConsultationMatch 와 같은 값이다. */
const POLL_INTERVAL_MS = 3_000

/** 매칭을 더 기다릴 이유가 없어진 상태 — 성공(매칭)도 실패도 아닌 종료 */
const TERMINAL_STATUSES: ConsultationStatus[] = [
  CONSULTATION_STATUS.ENDED,
  CONSULTATION_STATUS.CANCELED,
  CONSULTATION_STATUS.FAILED,
]

function isMatchedStatus(status: ConsultationStatus | null): boolean {
  return (
    status === CONSULTATION_STATUS.MATCHED ||
    status === CONSULTATION_STATUS.IN_PROGRESS ||
    status === CONSULTATION_STATUS.RECONNECTING
  )
}

function isTerminalStatus(status: ConsultationStatus | null): boolean {
  return status !== null && TERMINAL_STATUSES.includes(status)
}

export interface ConsultationWaiting {
  /** 대기 순번(1부터). WAITING 이 아니면 null */
  queuePosition: number | null
  /** 역무원이 배정돼 화상 화면으로 넘어가도 된다 */
  isMatched: boolean
  /** 취소됐거나 실패해서 대기를 이어갈 수 없다 */
  isFailed: boolean
}

/**
 * 도움 요청(챗봇) 화면의 대기 상태 — "매칭됐는지"만 확인한다.
 *
 * 토큰은 여기서 받지 않는다. 카메라 권한을 얻기 전에 접속 토큰을 발급하면
 * 화상 화면에 도착하기도 전에 커넥션을 하나 써버리므로, 매칭 확인까지만
 * 이 훅이 맡고 실제 접속(joinSession)은 화상 화면의 useConsultationMatch 가
 * 미디어 권한을 얻은 뒤에 한다.
 *
 * `GET /consultations/{id}` 를 3초 폴링한다 — useConsultationMatch 와
 * 같은 API 를 쓰지만 토큰 발급 여부만 다르다.
 */
export function useConsultationWaiting(
  consultationId: number | null,
): ConsultationWaiting {
  const isActive = consultationId !== null

  const snapshot = useQuery({
    queryKey: queryKeys.consultation.detail(consultationId ?? 0),
    queryFn: () => {
      // enabled 가 isActive 를 가리므로 실제로는 null 일 때 호출되지 않는다.
      if (consultationId === null) {
        return Promise.reject(new Error('consultationId 가 없습니다.'))
      }
      return openviduApi.fetchSnapshot(consultationId)
    },
    enabled: isActive,
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? null
      return isMatchedStatus(status) || isTerminalStatus(status)
        ? false
        : POLL_INTERVAL_MS
    },
  })

  const status = snapshot.data?.status ?? null

  return {
    queuePosition: snapshot.data?.queuePosition ?? null,
    isMatched: isMatchedStatus(status),
    isFailed: snapshot.isError || isTerminalStatus(status),
  }
}
