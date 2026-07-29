import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { isMockBlacklisted } from '@/admin/features/blacklist/mockBlacklistStore'
import {
  FIRST_PAGE,
  toMockPageMeta,
  type PagedContent,
} from '@/admin/lib/paging'

/** GET /admins/history 의 content 한 건 */
export interface ConsultationHistory {
  consultationId: number
  userEmail: string
  /** AI 통화 요약 (FR-STAFF-001) */
  summary: string
  startTime: string
  endTime: string
  /** 해당 사용자가 현재 블랙리스트에 올라 있는지 */
  isBlack: boolean
}

const MOCK_LATENCY_MS = 400

function at(month: number, day: number, hour: number, minute: number): string {
  const date = new Date()
  date.setMonth(month - 1, day)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

/**
 * BE 개발 전이라 목 응답을 사용한다.
 * 연동 시 fetchConsultationHistory 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_HISTORY: readonly ConsultationHistory[] = [
  {
    consultationId: 120,
    userEmail: 'user1@mail.com',
    summary: '출구 안내 요청 → 3번 출구 안내 완료',
    startTime: at(7, 17, 10, 20),
    endTime: at(7, 17, 10, 32),
    isBlack: false,
  },
  {
    consultationId: 121,
    userEmail: 'user2@mail.com',
    summary: '환승 경로 문의 → 4호선 환승 안내',
    startTime: at(7, 17, 11, 5),
    endTime: at(7, 17, 11, 14),
    isBlack: false,
  },
  {
    consultationId: 122,
    userEmail: 'user3@mail.com',
    summary: '승차권 발매기 사용법 안내',
    startTime: at(7, 17, 12, 41),
    endTime: at(7, 17, 12, 59),
    isBlack: false,
  },
  {
    consultationId: 123,
    userEmail: 'user4@mail.com',
    summary: '분실물 문의 → 유실물 센터 연결',
    startTime: at(7, 16, 18, 22),
    endTime: at(7, 16, 18, 30),
    isBlack: false,
  },
  {
    consultationId: 124,
    userEmail: 'user5@mail.com',
    summary: '욕설·비협조 → 경고 후 종료',
    startTime: at(7, 16, 20, 3),
    endTime: at(7, 16, 20, 11),
    isBlack: true,
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchConsultationHistory(): Promise<
  PagedContent<ConsultationHistory>
> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<PagedContent<ConsultationHistory>>>(
  //     endpoints.admin.history(FIRST_PAGE),
  //   )
  //   return res.data.data
  await delay(MOCK_LATENCY_MS)

  // isBlack 은 목 저장소가 소유한다. 등록·해제 결과가 이 목록에 바로 반영된다.
  const content = MOCK_HISTORY.map((item) => ({
    ...item,
    isBlack: isMockBlacklisted(item.userEmail),
  }))

  return { content, page: toMockPageMeta(content.length) }
}

/**
 * 민원 기록 (FR-STAFF-001).
 *
 * 대기 목록과 달리 실시간성이 필요 없어 폴링하지 않는다.
 * 상담이 종료되거나 블랙리스트가 바뀔 때 쿼리를 무효화해서 갱신한다.
 * TODO: page.totalPages 를 쓰는 페이지네이션은 목록 UI 확정 후 추가한다.
 */
export function useConsultationHistory() {
  return useQuery({
    queryKey: queryKeys.consultation.history(FIRST_PAGE),
    queryFn: fetchConsultationHistory,
  })
}
