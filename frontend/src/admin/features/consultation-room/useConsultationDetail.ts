import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { LangCode } from '@/admin/lib/language'

/**
 * 화상 상담 중 역무원 화면에 표시할 상담 정보.
 *
 * 필드명은 상담 대기 리스트 조회(GET /staffs/waiting)의 content 와 동일하게 맞췄다.
 * 같은 값을 상담 화면에서도 받기로 합의했으므로 이름이 갈리면 안 된다.
 *
 * 블랙리스트 여부는 여기에 두지 않는다. 블랙리스트 사용자는 화상 연결 자체가
 * 거부되므로 상담방에 들어온 사용자는 정의상 블랙리스트가 아니고, 명세의 합의된
 * 응답 필드에도 없다. 통화 중 등록한 직후의 "차단됨" 표시만 필요하므로
 * 상담 페이지가 로컬 상태로 관리한다.
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
}

async function fetchConsultationDetail(
  consultationId: number,
): Promise<ConsultationDetail> {
  /*
    TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체.

    ⚠️ endpoints.admin.consultationDetail(= GET /staffs/consultations?id=) 를
       쓰면 안 된다. 이름은 비슷하지만 그 API 는 민원 기록의 녹취 조회용이고
       응답이 { email, summary, recordUrl, expiresIn } 뿐이다. 이 화면이 필요한
       startPoint/finalPoint/langCode 가 없어 undefined 로 렌더된다.
       (DB consultations 에는 departure/destination 이 있으니 응답에 추가하거나
        전용 엔드포인트를 내달라고 BE 와 합의할 것)

    지금은 대기 목록(GET /staffs/waiting)이 같은 값을 이미 주고 있어, 수락
    시점에 받은 항목을 넘기는 방식으로도 해결된다.
  */
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
 *
 * 잘못된 URL 로 들어오면 호출부가 0 을 넘긴다. 그때 요청을 보내면
 * 실패하고 리트라이까지 도니 enabled 로 아예 막는다.
 */
export function useConsultationDetail(consultationId: number) {
  return useQuery({
    queryKey: queryKeys.consultation.detail(consultationId),
    queryFn: () => fetchConsultationDetail(consultationId),
    enabled: consultationId > 0,
  })
}
