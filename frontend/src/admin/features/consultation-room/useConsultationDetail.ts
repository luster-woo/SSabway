import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { ApiResponse } from '@/shared/types/api'
import type { WaitingConsultation } from '@/admin/features/consultation-receive/useWaitingConsultations'
import { useConsultationDetailStore } from '@/admin/features/consultation-room/useConsultationDetailStore'
import type { LangCode } from '@/admin/lib/language'

/**
 * 화상 상담 중 역무원 화면에 표시할 상담 정보.
 *
 * 필드명은 상담 대기 리스트 조회(GET /staffs/waiting)의 content 와 동일하게 맞췄다.
 * 같은 값을 상담 화면에서도 받기로 합의했으므로 이름이 갈리면 안 된다.
 *
 * 블랙리스트 여부는 여기에 두지 않는다. 블랙리스트 사용자는 화상 연결 자체가
 * 거부되므로 상담방에 들어온 사용자는 정의상 블랙리스트가 아니고, 통화 중
 * 등록한 직후의 "차단됨" 표시만 필요하므로 상담 페이지가 로컬 상태로 관리한다.
 */
export interface ConsultationDetail {
  consultationId: number
  /** 상담 요청자 이메일 — 블랙리스트 등록이 이 값으로 나간다 */
  email: string
  /** 시작위치 */
  startPoint: string
  /** 도착위치 */
  finalPoint: string
  langCode: LangCode
}

/**
 * 수락 시점에 대기 목록에서 넘어온 항목 → 상담 정보.
 * 두 화면 모델의 필드가 같아 골라 담기만 한다.
 */
export function toConsultationDetail(
  waiting: WaitingConsultation,
): ConsultationDetail {
  return {
    consultationId: waiting.consultationId,
    email: waiting.email,
    startPoint: waiting.startPoint,
    finalPoint: waiting.finalPoint,
    langCode: waiting.langCode,
  }
}

/**
 * GET /staffs/consultations/{id} 응답 — ⚠️ BE 신설 요청 상태 (8/4).
 * WaitingResponse 와 같은 필드를 consultationId 단건으로 돌려달라고 제안했다.
 *
 * ⚠️ endpoints.admin.consultationDetail(= GET /staffs/consultations?id=) 과
 *    다른 API 다. 그쪽은 민원 기록의 녹취 조회용이고 응답이
 *    { email, summary, recordUrl, expiresIn } 뿐이라 이 화면에는 못 쓴다.
 */
interface ConsultationInfoDto {
  consultationId: number
  email: string
  departure: string
  destination: string
  language: LangCode
}

async function fetchConsultationDetail(
  consultationId: number,
): Promise<ConsultationDetail> {
  const res = await adminApi.get<ApiResponse<ConsultationInfoDto>>(
    endpoints.admin.consultationInfo(consultationId),
  )
  const dto = res.data.data
  return {
    consultationId: dto.consultationId,
    email: dto.email,
    startPoint: dto.departure,
    finalPoint: dto.destination,
    langCode: dto.language,
  }
}

/**
 * 상담 정보 조회.
 *
 * 수락 시점에 WaitingPanel 이 스토어(useConsultationDetailStore,
 * sessionStorage persist)에 넣어 둔 값을 우선 쓴다. 통화 중 바뀌는 값이
 * 아니라 staleTime 을 무한으로 두고, 새로고침해도 스토어가 살아 있어 서버
 * 조회가 필요 없다.
 *
 * 서버 조회는 스토어가 빌 때(직접 URL 진입, 다른 탭)만 도는 폴백이다 —
 * ⚠️ BE 신설 전까지 실서버에서 이 경로는 404 라 "불러오지 못했습니다"가
 * 뜬다. 목(MSW)은 동작한다.
 *
 * 스토어 값은 URL 의 consultationId 와 일치할 때만 쓴다. 지난 상담의
 * 잔여 값이 다른 상담에 섞이면 안 된다.
 */
export function useConsultationDetail(consultationId: number) {
  const stored = useConsultationDetailStore((s) => s.detail)
  const initial =
    stored && stored.consultationId === consultationId ? stored : null

  return useQuery({
    /*
      ⚠️ 'info' 세그먼트가 꼭 필요하다. 사용자 쪽 useConsultationMatch 가
      같은 [...all, id] 키에 전혀 다른 모양(ConsultationSnapshot)을 캐싱한다 —
      세그먼트 없이 쓰면 한 탭에서 user ↔ admin 을 오갈 때 캐시가 섞인다.
    */
    queryKey: [...queryKeys.consultation.detail(consultationId), 'info'],
    queryFn: () => fetchConsultationDetail(consultationId),
    initialData: initial ?? undefined,
    staleTime: Infinity,
    enabled: consultationId > 0,
  })
}
