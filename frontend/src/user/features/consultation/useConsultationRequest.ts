import { useCallback, useState } from 'react'

import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { openviduApi } from '@/user/features/consultation/openviduApi'

export interface UseConsultationRequestResult {
  /**
   * 상담을 요청하고 consultationId 를 돌려준다.
   *
   * 실패하거나 아직 API 가 없으면 null. 호출부는 null 을 받으면 상담 ID 없이
   * 화상 화면으로 보내고, 화면이 안내 문구를 띄운다.
   */
  requestConsultation: () => Promise<number | null>
  isPending: boolean
  /** 403 BLACKLISTED 등으로 요청이 거절됐다 */
  isRejected: boolean
}

/**
 * 상담 요청 — 대기열 등록.
 *
 * ⚠️ `POST /api/v1/consultations` 는 아직 BE 미구현이다.
 * 플래그가 꺼져 있는 동안에는 호출하지 않고 null 을 돌려준다.
 * 연결 검증 중에는 역무원 대기 목록의 ID 를 쿼리 파라미터로 직접 넘긴다.
 *
 * TODO: 블랙리스트 403 을 화면 문구로 구분해야 한다. 지금은 서버가 에러 코드를
 *       주지 않아 isRejected 를 채울 근거가 없다. (BACKEND_READY.ERROR_CODES)
 */
export function useConsultationRequest(): UseConsultationRequestResult {
  const [isPending, setIsPending] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const requestConsultation = useCallback(async (): Promise<number | null> => {
    if (!BACKEND_READY.CONSULTATION_STATUS) return null

    setIsPending(true)
    setIsRejected(false)

    try {
      const snapshot = await openviduApi.requestConsultation()
      return snapshot.consultationId
    } catch {
      setIsRejected(true)
      return null
    } finally {
      setIsPending(false)
    }
  }, [])

  return { requestConsultation, isPending, isRejected }
}
