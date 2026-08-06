import { useCallback, useState } from 'react'

import type { UserMe } from '@/shared/types/user'
import { fetchUserMe } from '@/user/features/auth/lib/fetchUserMe'

export interface UseUserMeResult {
  /** 조회 성공이면 사용자 정보, 실패면 null. 던지지 않는다. */
  load: () => Promise<UserMe | null>
  isPending: boolean
}

/**
 * 유저 개인 정보 조회 (회원 탈퇴 전용).
 *
 * TanStack Query 를 쓰지 않는다. 사용자가 [회원탈퇴]를 누른 그 순간에만 필요한
 * 일회성 읽기이고, 캐시에 남겨 둘 이유가 없다 — 오히려 이메일이 캐시에 머무는
 * 편이 나쁘고, 한 탭에서 계정을 갈아탄 경우 지난 계정 정보를 보여줄 위험이 있다.
 * (같은 기준으로 useWithdraw·useLogin 도 Query 를 쓰지 않는다)
 *
 * 실패를 던지지 않고 null 로 돌려준다. 호출부가 "다시 시도" 단계를 보여주는 것이
 * 전부라 예외로 승격할 이유가 없다. 401 은 여기 오기 전에 userApi 인터셉터가
 * 재발급으로 처리하고, 그래도 안 되면 로그인 화면으로 보낸다.
 */
export function useUserMe(): UseUserMeResult {
  const [isPending, setIsPending] = useState(false)

  const load = useCallback(async () => {
    setIsPending(true)
    try {
      return await fetchUserMe()
    } catch {
      return null
    } finally {
      setIsPending(false)
    }
  }, [])

  return { load, isPending }
}
