import { useCallback, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import { PARTICIPANT_ROLE } from '@/shared/types'
import { useAdminProfileStore } from '@/admin/features/auth/useAdminProfileStore'
import {
  isMockAccepted,
  markMockAccepted,
} from '@/admin/features/consultation-receive/useWaitingConsultations'
import { openviduApi } from '@/admin/lib/openviduApi'

/** 상담 수락 실패 사유. 화면이 분기해야 하는 경우만 구분한다. */
export const ACCEPT_FAILURE = {
  /** 409 ALREADY_ACCEPTED — 다른 역무원이 먼저 수락 */
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
  UNKNOWN: 'UNKNOWN',
} as const

export type AcceptFailure = (typeof ACCEPT_FAILURE)[keyof typeof ACCEPT_FAILURE]

/** staffCode 가 없을 때(로그인 미연동) 쓰는 임시 참가자 ID */
const FALLBACK_STAFF_ID = 'staff'

export interface UseAcceptConsultationResult {
  /** 성공하면 null, 실패하면 사유를 반환한다. */
  accept: (consultationId: number) => Promise<AcceptFailure | null>
  /** 수락 요청 중인 상담 ID. 해당 카드만 버튼을 비활성화하는 데 쓴다. */
  pendingId: number | null
}

/**
 * 상담 수락 — 화상 세션 생성 + 토큰 발급 + 녹음 시작.
 *
 * 백엔드에 상담 리소스 래퍼가 없어 세 번의 호출로 이뤄지며, 순서와 롤백은
 * `@/shared/api/openvidu` 의 openSession 이 책임진다. 여기서는 결과를 스토어에
 * 넣어 상담 화면으로 넘기는 일만 한다.
 *
 * 수락과 동시에 녹음이 시작된다. 녹음 파일은 종료 시 OpenVidu 가 처리를 마치고
 * `recordingStatusChanged: ready` 웹훅을 보내면 백엔드가 S3 로 올린다.
 * 프론트가 파일을 직접 다루는 구간은 없다.
 *
 * 실패해도 대기 목록 쿼리를 무효화한다. 이미 없어진 항목이 화면에 남으면 안 된다.
 */
export function useAcceptConsultation(): UseAcceptConsultationResult {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const startSession = useConsultationSessionStore((s) => s.startSession)
  const staffCode = useAdminProfileStore((s) => s.staffCode)

  const accept = useCallback(
    async (consultationId: number): Promise<AcceptFailure | null> => {
      setPendingId(consultationId)

      try {
        /*
          ⚠️ 선착순 판정을 프론트가 흉내 내는 구간.

          서버가 상담 상태를 잠그지 않아 두 역무원이 동시에 눌러도 둘 다 세션을
          만들 수 있다. 대기 목록 자체가 아직 목이라 같은 목 저장소로 막아 둔다.
          ADMIN_QUEUE 를 켤 때 이 블록과 markMockAccepted 호출을 함께 지운다.
        */
        if (!BACKEND_READY.ADMIN_QUEUE && isMockAccepted(consultationId)) {
          return ACCEPT_FAILURE.ALREADY_ACCEPTED
        }

        const session = await openviduApi.openSession(
          consultationId,
          staffCode ?? FALLBACK_STAFF_ID,
          PARTICIPANT_ROLE.STAFF,
        )

        startSession(session)
        if (!BACKEND_READY.ADMIN_QUEUE) markMockAccepted(consultationId)
        return null
      } catch (error) {
        // 서버가 상담 상태를 잠그면 409 로 선착순 실패가 온다
        return axios.isAxiosError(error) && error.response?.status === 409
          ? ACCEPT_FAILURE.ALREADY_ACCEPTED
          : ACCEPT_FAILURE.UNKNOWN
      } finally {
        setPendingId(null)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [queryClient, startSession, staffCode],
  )

  return { accept, pendingId }
}
