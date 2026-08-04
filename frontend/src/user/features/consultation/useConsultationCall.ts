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
   * `POST /consultations/{id}/leave` 하나로 끝낸다 — ✅ BE 구현됨 (8/4,
   * feat/S15P11D104-484-user-close). 사용자 전용 종료 API 로:
   *   - WAITING·MATCHED → 취소 처리 (OpenVidu 세션까지 정리)
   *   - IN_PROGRESS     → 녹음·세션 정리 후 ENDED 전이
   *   - CANCELED·ENDED  → 멱등 성공
   * 즉 프론트가 상담 상태를 몰라도 된다 — 서버가 상태를 보고 알아서 가른다.
   * 요청자 본인인지도 서버가 검증한다(CONSULTATION_ACCESS_DENIED).
   *
   * 예전의 「end 시도 → 실패하면 leave」 순차 호출은 제거했다. end 는 역무원
   * 1-call 용이라 recordId 가 없는 수락 직후 구간을 항상 거절해서, 이 화면의
   * 종료가 매번 실패 요청 한 번을 먼저 내고 시작했다. leave 가 그 구간까지
   * 덮으면서 폴백일 이유가 없어졌다.
   *
   * 기다리지 않는다(최선형) — 화면은 즉시 닫혀야 하고, 실패해도 사용자가
   * 할 수 있는 일이 없다.
   */
  const leaveCall = useCallback(() => {
    leave()

    if (consultationId <= 0) return

    void openviduApi.leaveConsultation(consultationId).catch(() => {
      // 통화 종료 자체를 막지는 않는다. 서버 정리가 실패해도 사용자가
      // 할 수 있는 일이 없고, 화면은 이미 닫히는 중이다.
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
