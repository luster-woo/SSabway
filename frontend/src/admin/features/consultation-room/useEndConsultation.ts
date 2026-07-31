import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import type { EndResult } from '@/shared/types'
import { openviduApi } from '@/admin/lib/openviduApi'

export interface UseEndConsultationResult {
  /** 성공하면 결과, 실패하면 null */
  endConsultation: (consultationId: number) => Promise<EndResult | null>
  isPending: boolean
}

/**
 * 상담 종료 — 녹음 정지 + 세션 종료 + 상담 ENDED 전이.
 *
 * 녹음 파일은 여기서 올리지 않는다. OpenVidu 가 녹음 처리를 마치고 웹훅을 보내면
 * 백엔드가 S3 에 저장한다. 따라서 종료 응답이 와도 업로드는 진행 중일 수 있고,
 * 요약 완료 여부는 민원 기록 화면에서 summaryStatus 로 확인한다.
 *
 * 조회가 아니라 서버 상태를 바꾸는 명령이라 로컬 상태로 처리하고,
 * 종료되면 대기 목록과 민원 기록이 달라지므로 상담 관련 쿼리를 무효화한다.
 */
export function useEndConsultation(): UseEndConsultationResult {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const session = useConsultationSessionStore((s) => s.session)
  const clearSession = useConsultationSessionStore((s) => s.clearSession)

  const endConsultation = useCallback(
    async (consultationId: number): Promise<EndResult | null> => {
      setIsPending(true)

      // 다른 상담의 세션이 남아 있으면 그걸 끊어버리므로 ID 를 확인한다
      const current =
        session !== null && session.consultationId === consultationId
          ? session
          : null

      try {
        return await openviduApi.endConsultation(consultationId, current)
      } catch {
        return null
      } finally {
        setIsPending(false)
        clearSession()
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [clearSession, queryClient, session],
  )

  return { endConsultation, isPending }
}
