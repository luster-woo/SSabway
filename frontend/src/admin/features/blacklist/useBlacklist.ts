import { useCallback, useState } from 'react'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { updateMockBlacklistReason } from '@/admin/features/blacklist/mockBlacklistStore'
import {
  toReasonCodes,
  type BlacklistReasonCode,
} from '@/admin/features/blacklist/blacklistReasons'
import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'
import type { PagedContent } from '@/admin/lib/paging'

/**
 * GET /staffs/blacklist 의 content 한 건. 백엔드 BlacklistResponse 필드를 그대로 따른다.
 * reasons 는 영문 enum 코드 배열이라, 화면에 뿌릴 때 라벨로 변환한다(toReasonLabels).
 */
export interface BlacklistEntry {
  userEmail: string
  reasons: BlacklistReasonCode[]
  /** 블랙 등록 시각 (LocalDateTime ISO 문자열) */
  registeredAt: string
}

const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 백엔드는 페이지를 1부터 센다(@Min(1)). 페이지당 5건은 서버가 정한다. */
export const BLACKLIST_FIRST_PAGE = 1

async function fetchBlacklist(
  page: number,
): Promise<PagedContent<BlacklistEntry>> {
  const res = await adminApi.get<ApiResponse<PagedContent<BlacklistEntry>>>(
    endpoints.admin.blacklist.list(page),
  )
  return res.data.data
}

/**
 * 블랙리스트 명단. 명단 모달을 열 때만 조회한다.
 * page 는 백엔드 PageResponse 를 그대로 받아 화면 페이지네이션에 쓴다.
 * 페이지 이동 시 이전 데이터를 유지해 목록이 깜빡이지 않게 한다.
 */
export function useBlacklistRoster(enabled: boolean, page: number) {
  return useQuery({
    queryKey: queryKeys.blacklist.list(page),
    queryFn: () => fetchBlacklist(page),
    enabled,
    placeholderData: keepPreviousData,
  })
}

async function requestRegister(
  userEmail: string,
  reason: string,
): Promise<void> {
  // 화면은 사유를 콤마로 이은 한글 문자열로 넘긴다. 백엔드는 영문 enum 코드
  // 배열(reasons)을 받으므로 여기서 변환해 보낸다.
  const reasons = toReasonCodes(reason)

  // 응답 본문(success/message)은 쓰지 않는다. 실패 시 던져진 에러를 run() 이 잡아
  // false 로 바꾸고, 화면이 실패 토스트를 띄운다.
  await adminApi.post(endpoints.admin.blacklist.create, { userEmail, reasons })
}

async function requestUpdateReason(
  userEmail: string,
  reason: string,
): Promise<void> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   await adminApi.patch(endpoints.admin.blacklist.updateReason, { userEmail, reason })
  await delay(MOCK_LATENCY_MS)

  // reason 이 Non Null 이므로 목에서도 같은 조건으로 막는다.
  if (reason.trim() === '') throw new Error('사유가 비어 있습니다.')

  updateMockBlacklistReason(userEmail, reason)
}

async function requestRelease(userEmail: string): Promise<void> {
  // 백엔드는 POST /staffs/blacklist/release, body { userEmail } 로 소프트 삭제한다.
  // 응답 본문(success/message)은 쓰지 않는다. 실패는 run() 이 잡아 false 로 바꾼다.
  await adminApi.post(endpoints.admin.blacklist.release, { userEmail })
}

export interface UseBlacklistResult {
  registerBlacklist: (userEmail: string, reason: string) => Promise<boolean>
  updateBlacklistReason: (userEmail: string, reason: string) => Promise<boolean>
  releaseBlacklist: (userEmail: string) => Promise<boolean>
  /** 요청 중인 사용자 이메일. 해당 항목만 버튼을 비활성화하는 데 쓴다. */
  pendingEmail: string | null
}

/**
 * 블랙리스트 등록·사유 수정·해제 (FR-STAFF-002).
 *
 * 조회가 아니라 서버 상태를 바꾸는 명령이라 로컬 상태로 처리하고,
 * 끝나면 민원 기록과 명단 쿼리를 무효화해서 표시를 다시 받아온다.
 */
export function useBlacklist(): UseBlacklistResult {
  const queryClient = useQueryClient()
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const run = useCallback(
    async (userEmail: string, action: () => Promise<void>) => {
      setPendingEmail(userEmail)

      try {
        await action()
        return true
      } catch {
        return false
      } finally {
        setPendingEmail(null)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.blacklist.all,
        })
      }
    },
    [queryClient],
  )

  const registerBlacklist = useCallback(
    (userEmail: string, reason: string) =>
      run(userEmail, () => requestRegister(userEmail, reason)),
    [run],
  )

  const updateBlacklistReason = useCallback(
    (userEmail: string, reason: string) =>
      run(userEmail, () => requestUpdateReason(userEmail, reason)),
    [run],
  )

  const releaseBlacklist = useCallback(
    (userEmail: string) => run(userEmail, () => requestRelease(userEmail)),
    [run],
  )

  return {
    registerBlacklist,
    updateBlacklistReason,
    releaseBlacklist,
    pendingEmail,
  }
}
