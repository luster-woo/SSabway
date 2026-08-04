import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import type { EndResult } from '@/shared/types'
import { useConsultationDetailStore } from '@/admin/features/consultation-room/useConsultationDetailStore'
import { openviduApi } from '@/admin/lib/openviduApi'

export interface UseEndConsultationResult {
  /** 성공하면 결과, 실패하면 null */
  endConsultation: (consultationId: number) => Promise<EndResult | null>
  isPending: boolean
}

/**
 * 상담 종료 — 녹음 정지 + 세션 종료 + 상담 ENDED 전이.
 *
 * recordingId 는 서버가 DB(record_id)에서 스스로 찾으므로 프론트는 상담 ID 만
 * 넘긴다. 새로고침으로 스토어가 비어 있어도 문제없이 종료된다.
 * 이미 종료된 상담에 재요청해도 서버가 성공으로 응답하므로 재클릭에 안전하다.
 *
 * 녹음 파일은 여기서 올리지 않는다. OpenVidu 가 녹음 처리를 마치고 웹훅을 보내면
 * 백엔드가 S3 에 저장한다. 따라서 종료 응답이 와도 업로드는 진행 중일 수 있다.
 *
 * 조회가 아니라 서버 상태를 바꾸는 명령이라 로컬 상태로 처리하고,
 * 종료되면 대기 목록과 민원 기록이 달라지므로 상담 관련 쿼리를 무효화한다.
 */
export function useEndConsultation(): UseEndConsultationResult {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const clearSession = useConsultationSessionStore((s) => s.clearSession)
  const clearDetail = useConsultationDetailStore((s) => s.clearDetail)

  const endConsultation = useCallback(
    async (consultationId: number): Promise<EndResult | null> => {
      setIsPending(true)

      try {
        return await openviduApi.endConsultation(consultationId)
      } catch {
        return null
      } finally {
        setIsPending(false)
        // 세션·상담 정보 모두 이번 상담에만 유효하다. 남기면 다음 상담과 섞인다.
        clearSession()
        clearDetail()
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [clearDetail, clearSession, queryClient],
  )

  return { endConsultation, isPending }
}
