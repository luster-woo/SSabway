import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { queryKeys } from '@/shared/lib/queryKeys'
import {
  CONSULTATION_STATUS,
  PARTICIPANT_ROLE,
  type ConsultationStatus,
} from '@/shared/types'
import { openviduApi } from '@/user/features/consultation/openviduApi'

/** 상태 폴링 간격. 명세의 STOMP 폴백 규칙과 같은 값이다. */
const POLL_INTERVAL_MS = 3_000

export interface ConsultationMatch {
  /** 서버가 아는 상담 상태. 아직 모르면 null */
  status: ConsultationStatus | null
  /** 대기 순번(1부터). 상태 API 가 없으면 알 수 없어 null */
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
 * 사용자가 "매칭됐다"를 알아내는 경로.
 *
 * 서버 사정에 따라 두 가지 방식이 있고, 화면은 어느 쪽인지 몰라도 되도록
 * 같은 모양(`ConsultationMatch`)으로 돌려준다.
 *
 * 1. CONSULTATION_STATUS ON — `GET /consultations/{id}` 를 3초 폴링해
 *    MATCHED 를 확인하고 토큰을 발급받는다. 대기 순번도 여기서 온다. (목표 형태)
 * 2. OFF — ⚠️ 임시. 상태 API 가 없어 OpenVidu 세션이 열렸는지를 대신 본다.
 *    세션 존재 여부는 곧 역무원이 수락했는지와 같으므로 결과는 맞지만,
 *    대기 순번을 알 수 없고 서버 장애와 대기 중을 구분하지 못한다.
 *
 * STOMP 가 들어오면 1번의 폴링만 이벤트 수신으로 바뀐다. Query 는 그대로 남는다.
 */
export function useConsultationMatch(
  consultationId: number,
  /** 미디어 권한을 얻은 뒤에 시작한다. 순서가 반대면 발행할 트랙이 없다. */
  enabled: boolean,
): ConsultationMatch {
  const [token, setToken] = useState<string | null>(null)
  const [isFailed, setIsFailed] = useState(false)

  const isActive = enabled && consultationId > 0

  // ── 경로 1: 상태 폴링 ──
  const snapshot = useQuery({
    queryKey: queryKeys.consultation.detail(consultationId),
    queryFn: () => openviduApi.fetchSnapshot(consultationId),
    enabled: BACKEND_READY.CONSULTATION_STATUS && isActive,
    // 매칭되면 더 볼 이유가 없다. 이후 상태는 OpenVidu 이벤트가 알려준다.
    refetchInterval: (query) =>
      isMatchedStatus(query.state.data?.status ?? null)
        ? false
        : POLL_INTERVAL_MS,
  })

  const polledStatus = snapshot.data?.status ?? null

  useEffect(() => {
    if (!BACKEND_READY.CONSULTATION_STATUS) return
    if (!isActive || token !== null) return
    if (!isMatchedStatus(polledStatus)) return

    let isCurrent = true

    openviduApi
      .issueToken(consultationId)
      .then((session) => {
        if (isCurrent) setToken(session.token)
      })
      .catch(() => {
        if (isCurrent) setIsFailed(true)
      })

    return () => {
      isCurrent = false
    }
  }, [consultationId, isActive, polledStatus, token])

  // ── 경로 2 (임시): 세션이 열릴 때까지 커넥션 요청을 재시도 ──
  useEffect(() => {
    if (BACKEND_READY.CONSULTATION_STATUS) return
    if (!isActive || token !== null) return

    const controller = new AbortController()

    async function join() {
      try {
        const session = await openviduApi.joinSession(
          consultationId,
          `user-${String(consultationId)}`,
          PARTICIPANT_ROLE.USER,
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) setToken(session.token)
      } catch {
        if (!controller.signal.aborted) setIsFailed(true)
      }
    }

    void join()

    return () => {
      controller.abort()
    }
  }, [consultationId, isActive, token])

  /*
    상태 API 가 없을 때는 서버 상태를 모르므로 화면이 필요한 만큼만 흉내 낸다.
    토큰이 있으면 MATCHED, 없으면 WAITING. 이 분기는 플래그를 켤 때 지운다.
  */
  const status = BACKEND_READY.CONSULTATION_STATUS
    ? polledStatus
    : isActive
      ? token !== null
        ? CONSULTATION_STATUS.MATCHED
        : CONSULTATION_STATUS.WAITING
      : null

  return {
    status,
    queuePosition: snapshot.data?.queuePosition ?? null,
    token,
    isFailed: isFailed || snapshot.isError,
  }
}
