import { useEffect, useRef, useState } from 'react'

import { toSessionId } from '@/shared/api/openvidu'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import {
  OV_STATUS,
  useOpenViduSession,
  type OpenViduFailure,
  type OpenViduStatus,
} from '@/shared/webrtc/useOpenViduSession'
import { useRemoteViewportAspect } from '@/shared/webrtc/useViewportAspect'
import { openviduApi } from '@/admin/lib/openviduApi'
import type { StreamManager } from 'openvidu-browser'

export interface UseConsultationRoomResult {
  status: OpenViduStatus
  /**
   * FAILED 의 원인. 역무원은 오디오만 발행하므로 장치 실패는 곧 마이크 실패다.
   *
   * 화면(AdminConsultationPage)이 이 값으로 상담 취소 여부를 가른다 —
   * 마이크가 없으면 상담을 진행할 수 없고 대신 받아 줄 역무원도 없다.
   */
  failure: OpenViduFailure | null
  /** 사용자(여행객)가 발행한 스트림. 아직 안 들어왔으면 null */
  userStream: StreamManager | null
  /** 세션 복구 중(새로고침 직후) */
  isRestoring: boolean
  /** 복구조차 실패 — 상담이 이미 끝났거나 서버 문제 */
  isRestoreFailed: boolean
  /** 녹음이 돌고 있는지 (start 성공 여부) */
  isRecording: boolean
  /**
   * 사용자 화면의 가로 ÷ 세로. 사용자 브라우저가 재서 보내 준 값이고,
   * 아직 못 받았으면 null (VideoStage 가 기본 비율로 떨어진다).
   */
  userScreenAspect: number | null
}

/**
 * 역무원 상담방의 화상 연결.
 *
 * 역무원은 영상을 발행하지 않는다. 사용자가 후면 카메라로 표지판을 비추는 것을
 * 보면서 음성으로 안내하는 구조라 역무원 쪽 카메라는 필요가 없다.
 * 따라서 audio 만 발행하고 video 는 구독만 한다.
 *
 * 녹음(start)은 사용자 스트림이 도착한 순간 이쪽에서 시작한다 — 팀 합의(7/31):
 * "상담원과 유저가 모두 접속된 이후 녹음 시작". start 는 WAITING→IN_PROGRESS
 * 전이까지 겸하고 멱등이라, 새로고침 후 다시 불러도 REC 배지가 복원된다.
 *
 * 새로고침하면 스토어가 비므로 세션 ID 규칙으로 복원해 다시 커넥션을 받는다.
 * 같은 계정(JWT) 재접속은 서버가 이전 커넥션을 끊고 처리한다 (8/2 권한 업데이트).
 */
export function useConsultationRoom(
  consultationId: number,
): UseConsultationRoomResult {
  const session = useConsultationSessionStore((s) => s.session)
  const startSession = useConsultationSessionStore((s) => s.startSession)

  const [isRestoring, setIsRestoring] = useState(false)
  const [isRestoreFailed, setIsRestoreFailed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

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
        const restored = await openviduApi.joinSession(consultationId, {
          signal: controller.signal,
        })
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
  }, [consultationId, startSession, token])

  /*
    ovSession 이라 이름 붙인 이유 — 위쪽 `session` 은 스토어에 담긴 상담 세션
    정보(토큰·ID)이고 이건 접속이 끝난 OpenVidu 세션 객체다. 서로 다른 것이다.
  */
  const {
    status,
    failure,
    remoteStream,
    session: ovSession,
  } = useOpenViduSession({
    token,
    publish: { audio: true, video: false },
  })

  /*
    사용자 화면 비율. 영상 틀을 이 비율로 잡아야 사용자와 같은 화각이 된다 —
    상수로 박아 두면 기기마다 양옆이 어긋난다 (useViewportAspect 주석 참고).
  */
  const userScreenAspect = useRemoteViewportAspect(ovSession)

  /*
    사용자 접속을 확인한 순간 녹음을 시작한다.

    실패해도 통화는 끊지 않는다(명세 NFR-REL-003 5번) — REC 배지만 꺼진 채
    진행되고, 사용자 스트림이 재생성되는 재연결 시점에 자연히 재시도된다.
    started 응답이 오기 전 화면을 떠나는 경우를 위해 abort 표식을 둔다.
  */
  const isStartRequestedRef = useRef(false)

  useEffect(() => {
    if (status !== OV_STATUS.CONNECTED || remoteStream === null) return
    if (isStartRequestedRef.current || consultationId <= 0) return

    isStartRequestedRef.current = true
    let isCurrent = true

    openviduApi
      .startConsultation(toSessionId(consultationId))
      .then((started) => {
        if (isCurrent) setIsRecording(started)
      })
      .catch(() => {
        // 다음 스트림 이벤트에서 다시 시도할 수 있게 표식을 되돌린다
        isStartRequestedRef.current = false
      })

    return () => {
      isCurrent = false
    }
  }, [consultationId, remoteStream, status])

  return {
    status,
    failure,
    userStream: remoteStream,
    isRestoring,
    isRestoreFailed,
    isRecording,
    userScreenAspect,
  }
}
