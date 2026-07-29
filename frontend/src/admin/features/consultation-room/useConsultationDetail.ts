import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { LangCode } from '@/admin/lib/language'

/**
 * 화상 상담 중 역무원 화면에 표시할 상담 정보.
 *
 * 필드명은 상담 대기 리스트 조회(GET /admins/waiting)의 content 와 동일하게 맞췄다.
 * 같은 값을 상담 화면에서도 받기로 합의했으므로 이름이 갈리면 안 된다.
 *
 * TODO: isBlack 은 아직 합의된 4개 필드에 없다. 새로고침 후 "차단됨" 상태를
 *       복원하려면 필요하므로 BE 에 추가를 요청한다.
 */
export interface ConsultationDetail {
  consultationId: number
  /** 상담 요청자 이메일 */
  email: string
  /** 시작위치 */
  startPoint: string
  /** 도착위치 */
  finalPoint: string
  langCode: LangCode
  /** 이 사용자가 현재 블랙리스트에 올라 있는지 */
  isBlack: boolean
}

const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * BE 개발 전이라 목 응답을 사용한다.
 * 연동 시 fetchConsultationDetail 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_DETAIL: Omit<ConsultationDetail, 'consultationId'> = {
  email: 'user1@mail.com',
  startPoint: '대구역 3번 출구',
  finalPoint: '경북대 북문',
  langCode: 'EN',
  isBlack: false,
}

async function fetchConsultationDetail(
  consultationId: number,
): Promise<ConsultationDetail> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<ConsultationDetail>>(
  //     endpoints.admin.consultationDetail(consultationId),
  //   )
  //   return res.data.data
  await delay(MOCK_LATENCY_MS)

  if (!Number.isFinite(consultationId) || consultationId <= 0) {
    throw new Error('잘못된 상담 ID입니다.')
  }

  return { consultationId, ...MOCK_DETAIL }
}

/**
 * 상담 정보 조회.
 *
 * URL 의 consultationId 로 조회하므로 새로고침해도 정보가 유지된다.
 * 통화 중 바뀌지 않는 값이라 폴링하지 않는다.
 */
export function useConsultationDetail(consultationId: number) {
  return useQuery({
    queryKey: queryKeys.consultation.detail(consultationId),
    queryFn: () => fetchConsultationDetail(consultationId),
  })
}
