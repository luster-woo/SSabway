import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import type { ConsultationStatus } from '@/shared/types'
import type { Language } from '@/shared/types/user'
import {
  FIRST_PAGE,
  toMockPageMeta,
  type PagedContent,
} from '@/admin/lib/paging'

/** GET /admins/waiting 의 content 한 건 */
export interface WaitingConsultation {
  consultationId: number
  email: string
  startPoint: string
  finalPoint: string
  /** 상담을 요청한 사용자의 선호 언어. 대문자로 온다. (KO / EN / JA / ZH) */
  langCode: LangCode
  status: ConsultationStatus
  requestedAt: string
}

/** 대기 목록은 실시간성이 필요하지만 STOMP 도입 전이라 폴링으로 갱신한다. */
const POLL_INTERVAL_MS = 3_000
const MOCK_LATENCY_MS = 300

/**
 * 응답의 langCode 값 도메인. 배지에 그대로 표시한다.
 *
 * shared 의 Language('ko' | 'en' | 'ja' | 'zh')를 대문자로 좁힌 것이라
 * 지원 언어가 추가되면 이 타입도 따라간다.
 * 사용자 앱의 i18next 언어로 쓸 때는 toLowerCase() 가 필요하다.
 */
export type LangCode = Uppercase<Language>

/** requestedAt 부터 지금까지 경과한 분. 폴링으로 목록이 갱신될 때 다시 계산된다. */
export function toWaitedMinutes(requestedAt: string): number {
  const elapsedMs = Date.now() - new Date(requestedAt).getTime()
  return Math.max(0, Math.floor(elapsedMs / 60_000))
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/**
 * BE 개발 전이라 목 응답을 사용한다.
 * 연동 시 fetchWaitingConsultations 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_WAITING: readonly WaitingConsultation[] = [
  {
    consultationId: 128,
    email: 'user1@mail.com',
    startPoint: '대구역',
    finalPoint: '경북대 북문',
    langCode: 'EN',
    status: 'WAITING',
    requestedAt: minutesAgo(1),
  },
  {
    consultationId: 129,
    email: 'user2@mail.com',
    startPoint: '동대구역',
    finalPoint: '수성못',
    langCode: 'JA',
    status: 'WAITING',
    requestedAt: minutesAgo(3),
  },
  {
    consultationId: 130,
    email: 'user3@mail.com',
    startPoint: '반월당역',
    finalPoint: '서문시장',
    langCode: 'ZH',
    status: 'WAITING',
    requestedAt: minutesAgo(5),
  },
  {
    consultationId: 131,
    email: 'user4@mail.com',
    startPoint: '동대구역',
    finalPoint: '칠곡경대병원역',
    langCode: 'EN',
    status: 'WAITING',
    requestedAt: minutesAgo(7),
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 목 상태에서 수락된 상담을 목록에서 빼기 위한 저장소. 연동 시 함께 삭제한다. */
const mockAcceptedIds = new Set<number>()

export function markMockAccepted(consultationId: number): void {
  mockAcceptedIds.add(consultationId)
}

export function isMockAccepted(consultationId: number): boolean {
  return mockAcceptedIds.has(consultationId)
}

/**
 * 오래 기다린 순(requestedAt 오름차순)으로 세운다.
 * 먼저 요청한 사용자가 먼저 안내받아야 하고, 목록 첫 항목을 "다음에 받을 상담"으로
 * 강조하기 때문에 순서가 화면 의미에 직접 걸린다.
 * 서버가 정렬해 주더라도 결과가 같으므로 프론트에서 한 번 더 보장한다.
 */
function byWaitedLongestFirst(
  a: WaitingConsultation,
  b: WaitingConsultation,
): number {
  return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
}

async function fetchWaitingConsultations(): Promise<
  PagedContent<WaitingConsultation>
> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<PagedContent<WaitingConsultation>>>(
  //     endpoints.admin.waiting(FIRST_PAGE),
  //   )
  //   const { content, page } = res.data.data
  //   return { content: [...content].sort(byWaitedLongestFirst), page }
  await delay(MOCK_LATENCY_MS)

  const content = MOCK_WAITING.filter(
    (item) => !mockAcceptedIds.has(item.consultationId),
  ).sort(byWaitedLongestFirst)

  return { content, page: toMockPageMeta(content.length) }
}

/**
 * 상담 대기 목록.
 *
 * 서버가 소유한 목록 데이터라 TanStack Query 로 캐시·갱신을 맡긴다.
 * TODO: /sub/admin/consultations STOMP 구독이 붙으면 폴링을 제거한다.
 * TODO: page.totalPages 를 쓰는 페이지네이션은 목록 UI 확정 후 추가한다.
 */
export function useWaitingConsultations() {
  return useQuery({
    queryKey: queryKeys.consultation.waiting(FIRST_PAGE),
    queryFn: fetchWaitingConsultations,
    refetchInterval: POLL_INTERVAL_MS,
  })
}
