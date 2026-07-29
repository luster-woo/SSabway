import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'

/**
 * 종료 사유.
 *
 * 명세의 상담 종료 API 는 NORMAL | ERROR 만 받는다.
 * (부록의 EndReason 에는 USER_DISCONNECT·STAFF_DISCONNECT·TIMEOUT 도 있지만
 *  그 값들은 서버가 유예 초과 등을 감지해 스스로 붙이는 값이다)
 *
 * 블랙리스트 등록은 통화를 끊지 않고 등록만 하므로, 역무원이 누르는 종료는 항상 NORMAL 이다.
 */
export const END_REASON_NORMAL = 'NORMAL'

/** POST /api/v1/admin/consultations/{consultationId}/end 응답 */
export interface EndConsultationResult {
  consultationId: number
  status: 'ENDED'
  /** 통화 시간(초). 서버가 OpenVidu 웹훅 기준으로 확정한 값이다. */
  durationSec: number
  summaryStatus: 'PENDING' | 'DONE' | 'FAILED'
}

const MOCK_LATENCY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestEnd(
  consultationId: number,
): Promise<EndConsultationResult> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.post<ApiResponse<EndConsultationResult>>(
  //     endpoints.admin.end(consultationId),
  //     { endReason: END_REASON_NORMAL },
  //   )
  //   return res.data.data
  await delay(MOCK_LATENCY_MS)

  return {
    consultationId,
    status: 'ENDED',
    durationSec: 258,
    summaryStatus: 'PENDING',
  }
}

export interface UseEndConsultationResult {
  /** 성공하면 결과, 실패하면 null */
  endConsultation: (
    consultationId: number,
  ) => Promise<EndConsultationResult | null>
  isPending: boolean
}

/**
 * 상담 종료.
 *
 * 조회가 아니라 서버 상태를 바꾸는 명령이라 로컬 상태로 처리한다.
 * 종료되면 대기 목록과 민원 기록이 달라지므로 상담 관련 쿼리를 무효화한다.
 */
export function useEndConsultation(): UseEndConsultationResult {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const endConsultation = useCallback(
    async (consultationId: number) => {
      setIsPending(true)

      try {
        return await requestEnd(consultationId)
      } catch {
        return null
      } finally {
        setIsPending(false)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [queryClient],
  )

  return { endConsultation, isPending }
}
