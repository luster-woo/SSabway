import { useEffect, useState } from 'react'

import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import { PARTICIPANT_ROLE } from '@/shared/types'
import {
  useOpenViduSession,
  type OpenViduStatus,
} from '@/shared/webrtc/useOpenViduSession'
import { useAdminProfileStore } from '@/admin/features/auth/useAdminProfileStore'
import { openviduApi } from '@/admin/lib/openviduApi'
import type { StreamManager } from 'openvidu-browser'

const FALLBACK_STAFF_ID = 'staff'

export interface UseConsultationRoomResult {
  status: OpenViduStatus
  /** 사용자(여행객)가 발행한 스트림. 아직 안 들어왔으면 null */
  userStream: StreamManager | null
  /** 세션 복구 중(새로고침 직후) */
  isRestoring: boolean
  /** 복구조차 실패 — 상담이 이미 끝났거나 서버 문제 */
  isRestoreFailed: boolean
  /** 녹음이 돌고 있는지. 수락 시 녹음 시작에 실패했으면 false */
  isRecording: boolean
}

/**
 * 역무원 상담방의 화상 연결.
 *
 * 역무원은 영상을 발행하지 않는다. 사용자가 후면 카메라로 표지판을 비추는 것을
 * 보면서 음성으로 안내하는 구조라 역무원 쪽 카메라는 필요가 없다.
 * 따라서 audio 만 발행하고 video 는 구독만 한다.
 *
 * 새로고침하면 스토어가 비므로 세션 ID 규칙으로 복원해 다시 커넥션을 받는다.
 * 이때 recordingId 는 되찾을 수 없어 녹음 배지가 꺼진다 — 녹음 자체는 서버에서
 * 계속 돌고 있으므로 표시만 안 되는 것이다.
 * TODO: 상담 조회 API 가 생기면 recordingId 를 응답으로 받아 복원한다.
 */
export function useConsultationRoom(
  consultationId: number,
): UseConsultationRoomResult {
  const session = useConsultationSessionStore((s) => s.session)
  const startSession = useConsultationSessionStore((s) => s.startSession)
  const staffCode = useAdminProfileStore((s) => s.staffCode)

  const [isRestoring, setIsRestoring] = useState(false)
  const [isRestoreFailed, setIsRestoreFailed] = useState(false)

  // 다른 상담의 세션이 남아 있을 수 있으므로 ID 가 맞을 때만 쓴다
  const currentSession =
    session !== null && session.consultationId === consultationId
      ? session
      : null
  const token = currentSession?.token ?? null

  useEffect(() => {
    if (token !== null || consultationId <= 0) return

    const controller = new AbortController()
    setIsRestoring(true)
    setIsRestoreFailed(false)

    async function restore() {
      try {
        const restored = await openviduApi.joinSession(
          consultationId,
          staffCode ?? FALLBACK_STAFF_ID,
          PARTICIPANT_ROLE.STAFF,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        startSession(restored)
      } catch {
        if (controller.signal.aborted) return
        setIsRestoreFailed(true)
      } finally {
        if (!controller.signal.aborted) setIsRestoring(false)
      }
    }

    void restore()

    return () => {
      controller.abort()
    }
  }, [consultationId, staffCode, startSession, token])

  const { status, remoteStream } = useOpenViduSession({
    token,
    publish: { audio: true, video: false },
  })

  return {
    status,
    userStream: remoteStream,
    isRestoring,
    isRestoreFailed,
    isRecording: currentSession?.recordingId != null,
  }
}
