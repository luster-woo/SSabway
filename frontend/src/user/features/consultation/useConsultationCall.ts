import { useCallback } from 'react'

import type { StreamManager } from 'openvidu-browser'

import type { ConsultationStatus } from '@/shared/types'
import {
  useOpenViduSession,
  type OpenViduStatus,
} from '@/shared/webrtc/useOpenViduSession'
import { useConsultationMatch } from '@/user/features/consultation/useConsultationMatch'
import { openviduApi } from '@/user/features/consultation/openviduApi'

export interface UseConsultationCallResult {
  /** OpenVidu 연결 상태 */
  status: OpenViduStatus
  /** 서버가 아는 상담 상태. 상태 API 전에는 WAITING/MATCHED 만 흉내 낸다 */
  consultationStatus: ConsultationStatus | null
  /** 대기 순번(1부터). 상태 API 가 붙어야 값이 들어온다 */
  queuePosition: number | null
  /** 역무원 스트림(음성만). 재생하려면 엘리먼트에 붙여야 한다 */
  staffStream: StreamManager | null
  /** 역무원이 아직 수락하지 않아 기다리는 중 */
  isWaitingMatch: boolean
  /** 제한 시간 안에 매칭되지 않았다 */
  isJoinFailed: boolean
  /** 사용자가 통화를 끊는다 */
  leave: () => void
}

/**
 * 여행객 쪽 화상 통화.
 *
 * 매칭 감지는 useConsultationMatch 가 맡고, 여기서는 토큰이 생기면 접속하고
 * 카메라·마이크를 발행하는 일만 한다.
 *
 * 사용자가 [통화 종료] 를 누르면 연결을 끊고 상담도 종료 처리한다
 * (leaveCall 주석 참고 — end 우선, 실패 시 leave).
 */
export function useConsultationCall(
  consultationId: number,
  /** getUserMedia 로 미리 확보한 후면 카메라 + 마이크 스트림 */
  localStream: MediaStream | null,
): UseConsultationCallResult {
  const match = useConsultationMatch(consultationId, localStream !== null)

  const { status, remoteStream, leave } = useOpenViduSession({
    token: match.token,
    publish: localStream
      ? { stream: localStream, audio: true, video: true }
      : null,
  })

  /**
   * 연결을 끊고 상담을 종료 처리한다.
   *
   * 이 호출이 빠지면 상담이 활성 상태(MATCHED/IN_PROGRESS)로 남아, 같은
   * 사용자의 다음 도움 요청이 409 CONSULTATION_DUPLICATED 로 막힌다.
   *
   * ① `POST /openvidu/sessions/{sessionId}/end` — ✅ BE 구현됨.
   *    녹음 정지 → 세션 종료 → ENDED 전이를 서버가 한 번에 한다. 역무원의
   *    [상담 종료] 와 같은 API 이고, 이미 ENDED 면 멱등이다. 이 엔드포인트는
   *    `/api/v1/**` → authenticated() 라 STAFF 전용이 아니어서 사용자도 부를 수 있다.
   *
   * ② 실패하면 `POST /consultations/{id}/leave` — ⚠️ BE 미구현.
   *    end 는 `status != IN_PROGRESS` 면 CONSULTATION_NOT_IN_PROGRESS, recordId
   *    가 없으면 RECORDING_NOT_FOUND 로 거절한다. IN_PROGRESS 는 역무원이
   *    start 를 부른 뒤에야 되므로, 수락 직후 사용자가 먼저 끊는 구간은 end 로
   *    닫을 수 없다. 그 구간을 위한 자리가 leave 다.
   *
   * 상태로 미리 갈라내지 않고 순차로 시도하는 이유 — 사용자 쪽은 MATCHED 를
   * 확인한 뒤 폴링을 멈추므로(useConsultationMatch) 서버가 IN_PROGRESS 로
   * 넘어간 것을 알 수 없다. 즉 프론트의 상담 상태는 거의 항상 MATCHED 다.
   *
   * 기다리지 않는다(최선형) — 화면은 즉시 닫혀야 하고, 실패해도 사용자가
   * 할 수 있는 일이 없다.
   */
  const leaveCall = useCallback(() => {
    leave()

    if (consultationId <= 0) return

    void openviduApi
      .endConsultation(consultationId)
      .catch(() => openviduApi.leaveConsultation(consultationId))
      .catch(() => {
        // 통화 종료 자체를 막지는 않는다. (leave 는 BE 미구현 구간에서 404)
      })
  }, [consultationId, leave])

  return {
    status,
    consultationStatus: match.status,
    queuePosition: match.queuePosition,
    staffStream: remoteStream,
    isWaitingMatch:
      localStream !== null && match.token === null && !match.isFailed,
    isJoinFailed: match.isFailed,
    leave: leaveCall,
  }
}
