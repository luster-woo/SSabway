import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { ApiResponse } from '@/shared/types/api'
import type { PagedContent } from '@/admin/lib/paging'

/** 화면이 쓰는 민원 기록 한 건 */
export interface ConsultationHistory {
  consultationId: number
  userEmail: string
  /** AI 통화 요약 (FR-STAFF-001). 아직 생성되지 않았으면 null */
  summary: string | null
  startTime: string
  endTime: string
  /** 해당 사용자가 이 역에서 현재 차단 중인지 */
  isBlack: boolean
}

/**
 * GET /staffs/history 의 content 한 건 — 백엔드 HistoryResponse 를 그대로 따른다.

 *
 * 시간은 LocalDateTime 이라 오프셋 없이 `2026-07-22T14:12:00.123456` 형태로 온다.
 * (문서 표의 `+09:00` 은 실제 출력이 아니다) 컨테이너가 TZ=Asia/Seoul 이므로
 * 브라우저의 로컬 해석과 일치한다 — 마이크로초 6자리도 Date 가 그대로 파싱한다.
 *
 * blacklisted 는 컬럼이 아니라 Blacklist LEFT JOIN + releasedAt IS NULL 로 계산된
 * 값이다. 등록·해제 후 이 쿼리를 무효화하면 서버가 다시 계산해 준다.
 */
interface HistoryResponseDto {
  consultationId: number
  email: string
  summary: string | null
  /** 상담 시작 시각. status = ENDED 만 조회하므로 정상 데이터에서는 항상 있다. */
  startedAt: string
  endedAt: string
  blacklisted: boolean
}

function toConsultationHistory(dto: HistoryResponseDto): ConsultationHistory {
  return {
    consultationId: dto.consultationId,
    userEmail: dto.email,
    summary: dto.summary ?? null,
    startTime: dto.startedAt,
    endTime: dto.endedAt,
    isBlack: dto.blacklisted,
  }
}

/**
 * 페이지당 건수는 서버가 정한다 (백엔드 ConsultationService.PAGE_SIZE = 6).
 * 응답의 page 를 그대로 화면 페이지네이션에 쓰므로 프론트가 자르지 않는다.
 * 백엔드는 페이지를 1부터 센다(@Min(1)).
 */
async function fetchConsultationHistory(
  page: number,
): Promise<PagedContent<ConsultationHistory>> {
  const res = await adminApi.get<ApiResponse<PagedContent<HistoryResponseDto>>>(
    endpoints.admin.history(page),
  )

  const { content, page: pageInfo } = res.data.data

  // 정렬은 서버가 한다 (ORDER BY c.startedAt DESC). 페이지 단위로 잘려 오므로
  // 프론트가 다시 정렬해도 페이지 안에서만 유효해 의미가 없다.
  return { content: content.map(toConsultationHistory), page: pageInfo }
}

/**
 * 민원 기록 (FR-STAFF-001) — GET /staffs/history?page={page}
 *
 * 대기 목록과 달리 실시간성이 필요 없어 폴링하지 않는다.
 * 상담이 종료되거나 블랙리스트가 바뀔 때 쿼리를 무효화해서 갱신한다.
 * (useBlacklist 가 등록·해제·사유수정 후 queryKeys.consultation.all 을 무효화한다)
 * 페이지 이동 시 이전 데이터를 유지해 목록이 깜빡이지 않게 한다.
 */
export function useConsultationHistory(page: number) {
  return useQuery({
    queryKey: queryKeys.consultation.history(page),
    queryFn: () => fetchConsultationHistory(page),
    placeholderData: keepPreviousData,
  })
}
