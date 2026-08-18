import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import { useConsultationDetailStore } from '@/admin/features/consultation-room/useConsultationDetailStore'
import { openviduApi } from '@/admin/lib/openviduApi'

export interface UseStaffCancelConsultationResult {
  /** 취소됐으면 true, 실패하면 false */
  cancelConsultation: (consultationId: number) => Promise<boolean>
}

/**
 * 역무원이 상담을 취소한다 — 마이크를 쓸 수 없을 때.
 *
 * 종료(useEndConsultation)와 나뉘는 이유는 서버가 받는 구간이 달라서다.
 * 종료는 녹음이 도는 IN_PROGRESS 만 받고, 이쪽은 그 전인 WAITING·MATCHED 를
 * 받는다. 마이크 실패는 항상 녹음이 시작되기 전에 드러나므로 이 경로가 맞다.
 *
 * 정상 경로는 수락 전에 걸러내는 것이다(consultation-receive 의 micPermission).
 * 이 훅은 그 게이트를 통과한 뒤 상담방에서 깨지는 경우를 받는다 — 수락과
 * 입장 사이에 권한이 회수됐거나, 마이크가 뽑혔거나, 다른 앱이 점유한 경우.
 *
 * 세션·상담 정보를 비우고 상담 쿼리를 무효화하는 뒷정리는 종료와 같다.
 * 남겨 두면 다음 상담과 섞이고, 대기 목록에 취소된 상담이 그대로 남는다.
 */
export function useStaffCancelConsultation(): UseStaffCancelConsultationResult {
  const queryClient = useQueryClient()
  const clearSession = useConsultationSessionStore((s) => s.clearSession)
  const clearDetail = useConsultationDetailStore((s) => s.clearDetail)

  const cancelConsultation = useCallback(
    async (consultationId: number): Promise<boolean> => {
      try {
        await openviduApi.cancelConsultationByStaff(consultationId)
        return true
      } catch {
        return false
      } finally {
        clearSession()
        clearDetail()
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [clearDetail, clearSession, queryClient],
  )

  return { cancelConsultation }
}
