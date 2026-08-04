import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { ApiResponse, ConsultationStatus } from '@/shared/types'
import type { LangCode } from '@/admin/lib/language'
import { paginate, type PagedContent } from '@/admin/lib/paging'

/** GET /staffs/waiting 의 content 한 건 */
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

/** requestedAt 부터 지금까지 경과한 분. 폴링으로 목록이 갱신될 때 다시 계산된다. */
export function toWaitedMinutes(requestedAt: string): number {
  const elapsedMs = Date.now() - new Date(requestedAt).getTime()
  return Math.max(0, Math.floor(elapsedMs / 60_000))
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/**
 * ⚠️ 목 데이터. BACKEND_READY.ADMIN_QUEUE 를 켤 때 이 상수와
 * mockAcceptedIds / markMockAccepted / isMockAccepted / delay 를 함께 지운다.
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

/** 상담 대기는 페이지당 6건으로 나눈다. BE 연동 시 서버 page.size 로 대체된다. */
const WAITING_PAGE_SIZE = 6

/**
 * GET /staffs/waiting 의 content 한 건 (백엔드 WaitingResponse).
 * 화면 모델과 필드명이 다르고(departure/destination/language), status 는 없다.
 */
interface WaitingResponseDto {
  consultationId: number
  email: string
  departure: string
  destination: string
  language: LangCode
  requestedAt: string
}

/** 백엔드 응답을 화면 모델로. status 는 대기 목록이라 항상 WAITING 으로 채운다. */
function toWaitingConsultation(dto: WaitingResponseDto): WaitingConsultation {
  return {
    consultationId: dto.consultationId,
    email: dto.email,
    startPoint: dto.departure,
    finalPoint: dto.destination,
    langCode: dto.language,
    status: 'WAITING',
    requestedAt: dto.requestedAt,
  }
}

async function fetchWaitingConsultations(
  page: number,
): Promise<PagedContent<WaitingConsultation>> {
  if (BACKEND_READY.ADMIN_QUEUE) {
    const res =
      await adminApi.get<ApiResponse<PagedContent<WaitingResponseDto>>>(
        endpoints.admin.waiting(page),
      )
    const { content, page: pageInfo } = res.data.data
    const mapped = content.map(toWaitingConsultation).sort(byWaitedLongestFirst)
    return { content: mapped, page: pageInfo }
  }

  await delay(MOCK_LATENCY_MS)

  const all = MOCK_WAITING.filter(
    (item) => !mockAcceptedIds.has(item.consultationId),
  ).sort(byWaitedLongestFirst)

  return paginate(all, page, WAITING_PAGE_SIZE)
}

/**
 * 상담 대기 목록.
 *
 * 서버가 소유한 목록 데이터라 TanStack Query 로 캐시·갱신을 맡긴다.
 * 폴링으로 갱신되므로 페이지 이동 시 이전 데이터를 유지해 깜빡임을 막는다.
 * TODO: /sub/admin/consultations STOMP 구독이 붙으면 폴링을 제거한다.
 */
export function useWaitingConsultations(page: number) {
  return useQuery({
    queryKey: queryKeys.consultation.waiting(page),
    queryFn: () => fetchWaitingConsultations(page),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  })
}
