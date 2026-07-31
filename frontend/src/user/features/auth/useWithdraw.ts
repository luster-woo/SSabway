import { useCallback, useState } from 'react'
import { isAxiosError } from 'axios'

import { publicApi, refreshAccessToken } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { disableGoogleAutoSelect } from '@/shared/lib/googleIdentity'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

const WRONG_PASSWORD_KEY = 'auth.withdraw.error.wrongPassword'
const FALLBACK_ERROR_KEY = 'auth.withdraw.error.failed'

/**
 * 탈퇴 요청 한 번. (명세: PATCH /users, body { password }, Authorization 필수)
 *
 * userApi 를 쓰지 않는 이유: 이 API 의 401 은 "토큰 인증 실패"와
 * "비밀번호 불일치"를 구분하지 않는다. userApi 인터셉터는 401 을 보면
 * 재발급 → 재시도 → 또 401 이면 로그인 화면으로 리다이렉트해 버려서,
 * 비밀번호를 잘못 입력한 사용자가 로그아웃당하는 사고가 난다.
 * 그래서 인터셉터 없는 publicApi 에 토큰을 직접 실어 보내고,
 * 재발급·재시도·판정을 아래 requestWithdraw 가 직접 관리한다.
 */
async function attemptWithdraw(password: string, token: string): Promise<void> {
  await publicApi.patch(
    endpoints.users.withdraw,
    { password },
    { headers: { Authorization: `Bearer ${token}` } },
  )
}

/**
 * 탈퇴 요청. 401 이 오면 토큰을 한 번 재발급해 재시도한다.
 *
 *   1차 401 → 토큰 재발급(성공) → 2차 시도
 *     - 2차 성공  → 1차 401 은 토큰 만료였다 (비밀번호는 맞았음)
 *     - 2차 401   → 비밀번호 불일치로 판정
 *   재발급 자체가 실패하면 세션이 끝난 것이므로 그대로 던진다.
 *     (에러의 요청 경로가 withdraw 가 아니라서 비밀번호 문구로 오인되지 않는다)
 */
async function requestWithdraw(password: string): Promise<void> {
  const token = useAuthStore.getState().accessToken.user ?? ''

  try {
    await attemptWithdraw(password, token)
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error

    const freshToken = await refreshAccessToken('user')
    await attemptWithdraw(password, freshToken)
  }
}

/** 에러를 i18n 키로 바꾼다. withdraw 요청의 401 만 비밀번호 불일치다. */
function toWithdrawErrorKey(error: unknown): string {
  const isWrongPassword =
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.url === endpoints.users.withdraw

  return isWrongPassword ? WRONG_PASSWORD_KEY : FALLBACK_ERROR_KEY
}

export interface UseWithdrawResult {
  /** 성공 여부를 반환한다. 성공 시 로컬 토큰까지 지운다. */
  withdraw: (password: string) => Promise<boolean>
  isPending: boolean
  /** 실패 문구의 i18n 키. 없으면 null */
  errorKey: string | null
}

/**
 * 회원 탈퇴 (Soft Delete).
 *
 * 일회성 명령이므로 TanStack Query 를 쓰지 않는다. (로그인과 같은 기준)
 * 성공하면 서버 세션이 무효화되므로 로컬 액세스 토큰도 함께 지운다.
 */
export function useWithdraw(): UseWithdrawResult {
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken)
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const withdraw = useCallback(
    async (password: string) => {
      setIsPending(true)
      setErrorKey(null)

      try {
        await requestWithdraw(password)
        clearAccessToken('user')
        // 탈퇴한 계정으로 자동 재로그인되면 안 된다. (구글로 가입한 경우)
        disableGoogleAutoSelect()
        return true
      } catch (error) {
        setErrorKey(toWithdrawErrorKey(error))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [clearAccessToken],
  )

  return { withdraw, isPending, errorKey }
}
