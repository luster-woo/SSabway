import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import {
  listMockBlacklist,
  removeMockBlacklist,
  updateMockBlacklistReason,
} from '@/admin/features/blacklist/mockBlacklistStore'
import { toReasonCodes } from '@/admin/features/blacklist/blacklistReasons'
import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import {
  FIRST_PAGE,
  toMockPageMeta,
  type PagedContent,
} from '@/admin/lib/paging'

/**
 * GET /admins/blacklist 의 content 한 건. 명세서 응답 필드를 그대로 따른다.
 *
 * shared/types/consultation.ts 의 Blacklist 는 ERD 기준(userId·staffId·releasedAt)이라
 * 이 응답과 필드가 다르다. 화면은 API 응답을 쓰므로 여기서 따로 정의한다.
 */
export interface BlacklistEntry {
  blacklistId: number
  userEmail: string
  reason: string
  /** 블랙 등록 시간. 명세서 필드명이 registeredAt 이 아니라 registerTime 이다. */
  registerTime: string
}

const MOCK_LATENCY_MS = 400

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchBlacklist(): Promise<PagedContent<BlacklistEntry>> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   const res = await adminApi.get<ApiResponse<PagedContent<BlacklistEntry>>>(
  //     endpoints.admin.blacklist.list(FIRST_PAGE),
  //   )
  //   return res.data.data
  await delay(MOCK_LATENCY_MS)

  const content = listMockBlacklist()
  return { content, page: toMockPageMeta(content.length) }
}

/** 블랙리스트 명단. 명단 모달을 열 때만 조회한다. */
export function useBlacklistRoster(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.blacklist.list(FIRST_PAGE),
    queryFn: fetchBlacklist,
    enabled,
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
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
  //   await adminApi.put(endpoints.admin.blacklist.release, { userEmail })
  await delay(MOCK_LATENCY_MS)
  removeMockBlacklist(userEmail)
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
