import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import {
  isMockAccepted,
  markMockAccepted,
} from '@/admin/features/consultation-receive/useWaitingConsultations'

/** 상담 수락 실패 사유. 화면이 분기해야 하는 경우만 구분한다. */
export const ACCEPT_FAILURE = {
  /** 409 ALREADY_ACCEPTED — 다른 역무원이 먼저 수락 */
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
  UNKNOWN: 'UNKNOWN',
} as const

export type AcceptFailure = (typeof ACCEPT_FAILURE)[keyof typeof ACCEPT_FAILURE]

const MOCK_LATENCY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestAccept(consultationId: number): Promise<void> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체.
  //   409 응답이면 ACCEPT_FAILURE.ALREADY_ACCEPTED 로 변환해야 한다.
  //   const res = await adminApi.post(endpoints.admin.accept(consultationId))
  //   → 응답의 sessionId·token 은 화상 화면(-153)에서 사용한다.
  await delay(MOCK_LATENCY_MS)

  if (isMockAccepted(consultationId)) {
    throw new Error(ACCEPT_FAILURE.ALREADY_ACCEPTED)
  }

  markMockAccepted(consultationId)
}

export interface UseAcceptConsultationResult {
  /** 성공하면 null, 실패하면 사유를 반환한다. */
  accept: (consultationId: number) => Promise<AcceptFailure | null>
  /** 수락 요청 중인 상담 ID. 해당 카드만 버튼을 비활성화하는 데 쓴다. */
  pendingId: number | null
}

/**
 * 상담 수락.
 *
 * 수락은 캐시할 조회 결과가 아니라 서버 상태를 바꾸는 명령이라 로컬 상태로 처리하고,
 * 성공·실패 후에는 대기 목록 쿼리를 무효화해서 목록을 다시 받아온다.
 *
 * 여러 역무원이 같은 상담을 동시에 누를 수 있어 선착순 1명만 성공한다.
 * 실패한 쪽도 목록을 갱신해야 이미 없어진 항목이 화면에 남지 않는다.
 */
export function useAcceptConsultation(): UseAcceptConsultationResult {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const accept = useCallback(
    async (consultationId: number) => {
      setPendingId(consultationId)

      try {
        await requestAccept(consultationId)
        return null
      } catch (error) {
        const isAlreadyAccepted =
          error instanceof Error &&
          error.message === ACCEPT_FAILURE.ALREADY_ACCEPTED

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
    [queryClient],
  )

  return { accept, pendingId }
}
