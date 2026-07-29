import { useCallback, useState } from 'react'

const MOCK_LATENCY_MS = 400

/** 목 응답용 공개 샘플 음원. BE 연동 시 삭제한다. */
const MOCK_S3_PATH =
  'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * GET /admins/consultations?id={id} 응답.
 * 명세서 필드명이 카멜케이스가 아니라 `S3_path` 다.
 */
interface ConsultationRecordResponse {
  S3_path: string
}

async function fetchConsultationRecord(
  consultationId: number,
): Promise<ConsultationRecordResponse> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<ConsultationRecordResponse>>(
  //     endpoints.admin.consultationDetail(consultationId),
  //   )
  //   return res.data.data
  await delay(MOCK_LATENCY_MS)

  if (consultationId <= 0) throw new Error('잘못된 상담 ID입니다.')

  return { S3_path: MOCK_S3_PATH }
}

export interface UseConsultationRecordResult {
  /** 성공하면 녹취 경로, 실패하면 null */
  loadRecord: (consultationId: number) => Promise<string | null>
  /** 조회 중인 상담 ID */
  pendingId: number | null
}

/**
 * 원본 상담 내역(녹취) 경로 조회.
 *
 * 목록이 아니라 버튼을 누른 시점에 한 건만 가져오는 조회라
 * 캐시할 이유가 없어 로컬 상태로 처리한다.
 */
export function useConsultationRecord(): UseConsultationRecordResult {
  const [pendingId, setPendingId] = useState<number | null>(null)

  const loadRecord = useCallback(async (consultationId: number) => {
    setPendingId(consultationId)

    try {
      const { S3_path } = await fetchConsultationRecord(consultationId)
      return S3_path
    } catch {
      return null
    } finally {
      setPendingId(null)
    }
  }, [])

  return { loadRecord, pendingId }
}
