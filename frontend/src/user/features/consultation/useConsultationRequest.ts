import { useCallback, useState } from 'react'

import { openviduApi } from '@/user/features/consultation/openviduApi'

export interface UseConsultationRequestResult {
  /**
   * 상담을 요청하고 consultationId 를 돌려준다.
   * 실패하면(중복 요청 409, 블랙리스트 403 등) null.
   */
  requestConsultation: () => Promise<number | null>
  /**
   * 대기 취소. WAITING 이 아니게 됐거나(이미 매칭) 이미 취소됐어도 조용히
   * 넘어간다 — 화면은 이 호출 결과와 무관하게 로컬 대기 상태만 되돌리면 된다.
   */
  cancelConsultation: (consultationId: number) => Promise<void>
  isPending: boolean
  /** 403 BLACKLISTED 등으로 요청이 거절됐다 */
  isRejected: boolean
}

/**
 * 상담 요청 — 대기열 등록 + 취소.
 *
 * ⚠️ `POST /api/v1/consultations` 는 staffId 를 nullable 로 바꾸는 백엔드
 * 전환을 전제로 body 없이 호출한다. 전환 전에는 400 이 난다.
 * (`shared/api/endpoints.ts` 의 consultations 블록 주석 참고)
 *
 * TODO: 블랙리스트 403 을 화면 문구로 구분해야 한다. 에러 응답에 code 필드가
 *       추가되면(백엔드 요청 중) 403 + BLACKLISTED 로 좁힌다.
 */
export function useConsultationRequest(): UseConsultationRequestResult {
  const [isPending, setIsPending] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const requestConsultation = useCallback(async (): Promise<number | null> => {
    setIsPending(true)
    setIsRejected(false)

    try {
      const created = await openviduApi.requestConsultation()
      return created.consultationId
    } catch {
      setIsRejected(true)
      return null
    } finally {
      setIsPending(false)
    }
  }, [])

  const cancelConsultation = useCallback(
    async (consultationId: number): Promise<void> => {
      try {
        await openviduApi.cancelConsultation(consultationId)
      } catch {
        // 최선형 호출이다. 취소 시점에 이미 매칭돼 있어 서버가 거절(409)해도
        // 사용자 화면은 어차피 로컬 대기 상태만 되돌리면 되므로 흡수한다.
      }
    },
    [],
  )

  return { requestConsultation, cancelConsultation, isPending, isRejected }
}
