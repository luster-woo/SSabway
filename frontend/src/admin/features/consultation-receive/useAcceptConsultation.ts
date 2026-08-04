import { useCallback, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import { openviduApi } from '@/admin/lib/openviduApi'

/** 상담 수락 실패 사유. 화면이 분기해야 하는 경우만 구분한다. */
export const ACCEPT_FAILURE = {
  /** 409 ALREADY_ACCEPTED — 다른 역무원이 먼저 수락 */
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
  UNKNOWN: 'UNKNOWN',
} as const

export type AcceptFailure = (typeof ACCEPT_FAILURE)[keyof typeof ACCEPT_FAILURE]

export interface UseAcceptConsultationResult {
  /** 성공하면 null, 실패하면 사유를 반환한다. */
  accept: (consultationId: number) => Promise<AcceptFailure | null>
  /** 수락 요청 중인 상담 ID. 해당 카드만 버튼을 비활성화하는 데 쓴다. */
  pendingId: number | null
}

/**
 * 상담 수락 — accept 1-call (상태 잠금 + 세션 생성 + 토큰 발급).
 *
 * 호출은 `@/shared/api/openvidu` 의 openSession 이 책임진다.
 * 여기서는 결과를 스토어에 넣어 상담 화면으로 넘기는 일만 한다.
 * (8/4 — API 소유가 ssabway 로 이동. openSession 주석 참고)
 *
 * 녹음은 여기서 시작하지 않는다 — 사용자까지 접속한 뒤 상담방 훅
 * (useConsultationRoom)이 start 를 불러 시작한다. 팀 합의(7/31).
 *
 * 선착순은 서버가 상담 상태 잠금으로 판정한다. 늦게 누른 역무원은
 * 409 CONSULTATION_ALREADY_ACCEPTED 를 받는다.
 *
 * ⚠️ admin 로그인이 목 토큰인 동안(mockSwitch 'POST /staffs/login': true)에는
 *    실서버에서 401 이다 — 실서버 수락 테스트는 실존 staff 계정으로 로그인할 것.
 *
 * 실패해도 대기 목록 쿼리를 무효화한다. 이미 없어진 항목이 화면에 남으면 안 된다.
 */
export function useAcceptConsultation(): UseAcceptConsultationResult {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const startSession = useConsultationSessionStore((s) => s.startSession)

  const accept = useCallback(
    async (consultationId: number): Promise<AcceptFailure | null> => {
      setPendingId(consultationId)

      try {
        const session = await openviduApi.openSession(consultationId)

        startSession(session)
        return null
      } catch (error) {
        if (!axios.isAxiosError(error)) return ACCEPT_FAILURE.UNKNOWN

        /*
          ssabway 이관(8/4)으로 응답에 code 가 실린다. code 가 있으면 그걸로
          판정하고, 없으면(구버전 서버·프록시 오류 등) 상태코드 409 로
          폴백한다 — 서버가 상담 상태를 잠그므로 선착순 실패는 409 다.
        */
        const code = (error.response?.data as { code?: string } | undefined)
          ?.code
        const isAlreadyAccepted =
          code === 'CONSULTATION_ALREADY_ACCEPTED' ||
          (code === undefined && error.response?.status === 409)

        return isAlreadyAccepted
          ? ACCEPT_FAILURE.ALREADY_ACCEPTED
          : ACCEPT_FAILURE.UNKNOWN
      } finally {
        setPendingId(null)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [queryClient, startSession],
  )

  return { accept, pendingId }
}
