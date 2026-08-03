import { useCallback, useState } from 'react'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'

/**
 * GET /staffs/consultations?id={id} 의 data.
 *
 * 백엔드 ConsultationDetailResponse(email, summary, recordUrl, expiresIn) 를
 * 그대로 따른다. (ConsultationController.getDetail)
 *
 * ⚠️ 노션 명세 「Response」 표의 `S3_path` 는 실제 응답에 없다. 표가 낡았고
 *    같은 문서의 예시 JSON 이 백엔드 코드와 일치한다. `S3_path` 로 읽으면
 *    값이 undefined 가 되는데 요청 자체는 200 이라 에러도 나지 않고
 *    <audio src="undefined"> 로 재생만 조용히 실패한다. 필드명을 바꾸지 말 것.
 *
 * recordUrl 은 DB 컬럼이 아니라 서비스가 요청마다 새로 발급하는 S3 presigned
 * URL 이다. 녹취가 아직 없거나 업로드에 실패한 상담은 recordUrl 과 expiresIn 이
 * 함께 null 로 온다 — 백엔드가 "프론트가 요약만 띄우고 플레이어를 비활성화"
 * 하도록 의도한 응답이다. summary 도 consultations.summary 에 NOT NULL 제약이
 * 없어 null 이 가능하다.
 */
interface ConsultationRecordResponse {
  email: string
  summary: string | null
  recordUrl: string | null
  /** recordUrl 이 유효한 시간(초). 백엔드 RECORD_URL_DURATION = 10분 → 600 */
  expiresIn: number | null
}

/** 화면이 쓰는 원본 상담 내역. 필드가 응답과 1:1 이라 이름을 바꾸지 않는다. */
export interface ConsultationRecord {
  /** 상담 요청자 이메일 */
  email: string
  /** AI 요약. 아직 생성되지 않았으면 null */
  summary: string | null
  /** 녹취 presigned URL. 녹취가 없으면 null */
  recordUrl: string | null
  expiresIn: number | null
}

async function fetchConsultationRecord(
  consultationId: number,
): Promise<ConsultationRecord> {
  const res = await adminApi.get<ApiResponse<ConsultationRecordResponse>>(
    endpoints.admin.consultationDetail(consultationId),
  )

  const { email, summary, recordUrl, expiresIn } = res.data.data

  // 백엔드 ApiResponse 는 @JsonInclude(NON_NULL) 이지만 그 설정은 봉투 자신의
  // 필드에만 걸린다. data 안쪽은 null 이 그대로 실려 오고, 서버 설정이 바뀌면
  // 키째로 빠질 수도 있다. 두 경우를 같은 null 로 맞춰 화면이 한 가지만 검사하게
  // 한다. (undefined 가 새면 `recordUrl !== null` 검사를 그냥 통과해버린다)
  return {
    email,
    summary: summary ?? null,
    recordUrl: recordUrl ?? null,
    expiresIn: expiresIn ?? null,
  }
}

export interface UseConsultationRecordResult {
  /** 성공하면 상담 내역, 실패하면 null */
  loadRecord: (consultationId: number) => Promise<ConsultationRecord | null>
  /** 조회 중인 상담 ID */
  pendingId: number | null
}

/**
 * 원본 상담 내역(녹취) 조회 — GET /staffs/consultations?id={id} (FR-STAFF-001)
 *
 * 목록이 아니라 버튼을 누른 시점에 한 건만 가져오는 조회라 로컬 상태로 처리한다.
 * TanStack Query 로 캐시하지 않는 이유가 하나 더 있다: recordUrl 은 10분(expiresIn)
 * 뒤 만료되는 presigned URL 이라, 캐시가 살아 있으면 모달을 다시 열었을 때 이미
 * 죽은 URL 을 재생하려 한다. 열 때마다 새로 발급받는 편이 안전하다.
 *
 * 실패는 전부 null 로 접는다. 호출부가 나눠 보여줄 문구가 없기 때문이다.
 *   - 401 → client.ts 인터셉터가 토큰 재발급·로그인 이동까지 처리한다.
 *   - 404 CONSULTATION_NOT_FOUND → 조회 쿼리에 staffId 조건이 있어서
 *     "없는 상담"과 "다른 역무원의 상담"이 같은 응답으로 온다. 목록에서 고른
 *     항목이라 정상 흐름에서는 나오지 않는다.
 */
export function useConsultationRecord(): UseConsultationRecordResult {
  const [pendingId, setPendingId] = useState<number | null>(null)

  const loadRecord = useCallback(async (consultationId: number) => {
    // 백엔드 @RequestParam Long id 는 형식이 틀리면 400 이다. 보낼 필요가 없는
    // 요청이므로 여기서 끊는다. (조회 실패와 같은 null 이라 호출부는 그대로다)
    if (!Number.isInteger(consultationId) || consultationId <= 0) return null

    setPendingId(consultationId)

    try {
      return await fetchConsultationRecord(consultationId)
    } catch {
      return null
    } finally {
      setPendingId(null)
    }
  }, [])

  return { loadRecord, pendingId }
}
