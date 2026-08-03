import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { CONSULTATION_STATUS, type ConsultationStatus } from '@/shared/types'
import { openviduApi } from '@/user/features/consultation/openviduApi'

/** 상태 폴링 간격. 명세의 STOMP 폴백 규칙과 같은 값이다. */
const POLL_INTERVAL_MS = 3_000

export interface ConsultationMatch {
  /** 서버가 아는 상담 상태. 아직 모르면 null */
  status: ConsultationStatus | null
  /** 대기 순번(1부터). WAITING 이 아니면 null */
  queuePosition: number | null
  /** 발급된 접속 토큰. 이 값이 생기면 화상 접속을 시작한다 */
  token: string | null
  /** 매칭을 기다리다 실패했다 */
  isFailed: boolean
}

/** 역무원이 배정되어 접속해도 되는 상태인지 */
function isMatchedStatus(status: ConsultationStatus | null): boolean {
  return (
    status === CONSULTATION_STATUS.MATCHED ||
    status === CONSULTATION_STATUS.IN_PROGRESS ||
    status === CONSULTATION_STATUS.RECONNECTING
  )
}

/**
 * 사용자가 "매칭됐다"를 알아내고 접속 토큰을 받는다.
 *
 * `GET /consultations/{id}` 를 3초 폴링해 매칭과 대기 순번을 확인하고,
 * 매칭되면 `joinSession` 으로 커넥션(토큰)을 받는다. 별도의 토큰 발급
 * 엔드포인트는 없다 — 매칭 응답의 sessionId 규칙(`toSessionId`)이
 * `POST /openvidu/sessions/{sessionId}/connections` 와 그대로 맞물린다.
 *
 * joinSession 은 수락 직후의 레이스(세션이 아직 안 열림, 404)를 자체
 * 재시도하므로, 이 훅은 "매칭 확인 후 1회 호출"만 신경 쓰면 된다.
 * 새로고침해도 같은 절차로 재접속된다(consultationId 만 있으면 된다).
 *
 * STOMP 가 들어오면 폴링만 이벤트 수신으로 바뀌고 나머지는 그대로 남는다.
 */
export function useConsultationMatch(
  consultationId: number,
  /** 미디어 권한을 얻은 뒤에 시작한다. 순서가 반대면 발행할 트랙이 없다. */
  enabled: boolean,
): ConsultationMatch {
  const [token, setToken] = useState<string | null>(null)
  const [isFailed, setIsFailed] = useState(false)

  const isActive = enabled && consultationId > 0

  const snapshot = useQuery({
    queryKey: queryKeys.consultation.detail(consultationId),
    queryFn: () => openviduApi.fetchSnapshot(consultationId),
    enabled: isActive,
    // 매칭되면 더 볼 이유가 없다. 이후 상태는 OpenVidu 이벤트가 알려준다.
    refetchInterval: (query) =>
      isMatchedStatus(query.state.data?.status ?? null)
        ? false
        : POLL_INTERVAL_MS,
  })

  const status = snapshot.data?.status ?? null

  useEffect(() => {
    if (!isActive || token !== null) return
    if (!isMatchedStatus(status)) return

    const controller = new AbortController()
    let isCurrent = true

    openviduApi
      .joinSession(consultationId, { signal: controller.signal })
      .then((session) => {
        if (isCurrent) setToken(session.token)
      })
      .catch(() => {
        if (isCurrent) setIsFailed(true)
      })

    return () => {
      isCurrent = false
      controller.abort()
    }
  }, [consultationId, isActive, status, token])

  return {
    status,
    queuePosition: snapshot.data?.queuePosition ?? null,
    token,
    isFailed: isFailed || snapshot.isError,
  }
}
