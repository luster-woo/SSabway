import type { StreamManager } from 'openvidu-browser'

import type { ConsultationStatus } from '@/shared/types'
import {
  useOpenViduSession,
  type OpenViduStatus,
} from '@/shared/webrtc/useOpenViduSession'
import { useConsultationMatch } from '@/user/features/consultation/useConsultationMatch'

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
 * 통화 종료 시 녹음 정지는 역무원 쪽에서 일어난다. 명세의
 * `POST /consultations/{id}/leave` 가 아직 없어 사용자는 연결만 끊는다.
 * 사용자가 먼저 나가도 OpenVidu 가 세션 종료 웹훅을 보내므로 녹음은 마감된다.
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

  return {
    status,
    consultationStatus: match.status,
    queuePosition: match.queuePosition,
    staffStream: remoteStream,
    isWaitingMatch:
      localStream !== null && match.token === null && !match.isFailed,
    isJoinFailed: match.isFailed,
    leave,
  }
}
