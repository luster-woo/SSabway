import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { CONSULTATION_STATUS, type ConsultationStatus } from '@/shared/types'
import { openviduApi } from '@/user/features/consultation/openviduApi'

/** 상태 폴링 간격. 명세의 STOMP 폴백 규칙과 같은 값이다. */
const POLL_INTERVAL_MS = 3_000

/**
 * 매칭을 더 기다릴 이유가 없어진 상태 — useConsultationWaiting 과 같은 목록이다.
 *
 * 두 훅이 같은 API 를 폴링하는데 한쪽에만 이 분기가 있으면, 대기 화면은 취소를
 * 알아채고 화상 화면은 못 알아채는 비대칭이 생긴다. 실제로 그랬다.
 *
 * FAILED 는 오늘 어느 서버도 보내지 않는다 — ssabway·webrtc 양쪽 엔티티
 * enum 이 WAITING/MATCHED/IN_PROGRESS/ENDED/CANCELED 5종뿐이다. 형제 훅과
 * 목록을 어긋나게 둘 이유가 없어 남겨 두지만, FAILED 에 기대는 흐름을 새로
 * 만들면 안 된다. (같은 이유로 아래 isMatchedStatus 의 RECONNECTING 도 죽은 분기다)
 */
const TERMINAL_STATUSES: ConsultationStatus[] = [
  CONSULTATION_STATUS.ENDED,
  CONSULTATION_STATUS.CANCELED,
  CONSULTATION_STATUS.FAILED,
]

export interface ConsultationMatch {
  /** 서버가 아는 상담 상태. 아직 모르면 null */
  status: ConsultationStatus | null
  /** 대기 순번(1부터). WAITING 이 아니면 null */
  queuePosition: number | null
  /** 발급된 접속 토큰. 이 값이 생기면 화상 접속을 시작한다 */
  token: string | null
  /**
   * 이 상담으로 통화를 시작할 수 없다 — 접속 실패도, 서버가 이미 끝낸 상담도
   * 포함한다(형제 훅 useConsultationWaiting 과 같은 정의).
   *
   * "실패"와 "정상 종료"의 문구가 갈려야 하므로, 화면은 이 값으로 대기 UI 를
   * 걷고 무엇을 보여줄지는 `status` 로 가른다.
   */
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

/** 끝난 상담인지. 폴링을 멈추고 화면을 닫아야 한다 */
function isTerminalStatus(status: ConsultationStatus | null): boolean {
  return status !== null && TERMINAL_STATUSES.includes(status)
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
  /**
   * 미디어 권한을 얻었는지.
   *
   * **토큰 발급(joinSession)에만** 걸린다 — 순서가 반대면 발행할 트랙이 없다.
   * 상태 조회는 여기에 걸지 않는다. 걸어 두면 이미 끝난 상담으로 재진입했을 때
   * 카메라를 먼저 켠 뒤에야 종료를 알게 되어, 끌 필요도 없던 카메라가 한 번
   * 켜진다. 상태 조회는 GET 하나라 커넥션을 쓰지 않으므로 먼저 돌아도 된다.
   */
  isMediaReady: boolean,
): ConsultationMatch {
  const [token, setToken] = useState<string | null>(null)
  const [isFailed, setIsFailed] = useState(false)

  const hasConsultation = consultationId > 0

  const snapshot = useQuery({
    queryKey: queryKeys.consultation.detail(consultationId),
    queryFn: () => openviduApi.fetchSnapshot(consultationId),
    enabled: hasConsultation,
    /*
      매칭되면 더 볼 이유가 없다 — 이후 상태는 OpenVidu 이벤트가 알려준다.
      끝난 상담도 마찬가지다. 이 분기가 없으면 ENDED·CANCELED 를 받고도
      "매칭이 아니니 계속 기다린다"로 읽어 3초마다 영구히 폴링한다.
    */
    refetchInterval: (query) => {
      const polled = query.state.data?.status ?? null
      return isMatchedStatus(polled) || isTerminalStatus(polled)
        ? false
        : POLL_INTERVAL_MS
    },
  })

  const status = snapshot.data?.status ?? null

  useEffect(() => {
    if (!hasConsultation || !isMediaReady || token !== null) return
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
  }, [consultationId, hasConsultation, isMediaReady, status, token])

  return {
    status,
    queuePosition: snapshot.data?.queuePosition ?? null,
    token,
    isFailed: isFailed || snapshot.isError || isTerminalStatus(status),
  }
}
