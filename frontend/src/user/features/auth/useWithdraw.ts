import { useCallback, useState } from 'react'
import { isAxiosError } from 'axios'

import { publicApi, refreshAccessToken } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { disableGoogleAutoSelect } from '@/shared/lib/googleIdentity'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

const WRONG_PASSWORD_KEY = 'auth.withdraw.error.wrongPassword'
const SESSION_EXPIRED_KEY = 'auth.withdraw.error.sessionExpired'
const FALLBACK_ERROR_KEY = 'auth.withdraw.error.failed'

/**
 * 탈퇴 요청 한 번. (명세: PATCH /users, body { password }, Authorization 필수)
 *
 * `password` 가 null 인 경우 = 구글 가입자다. BE `UserService.withdraw` 는
 * `provider == LOCAL` 일 때만 비밀번호를 대조하므로 null 을 그대로 보낸다.
 *
 * ⚠️ BE `WithdrawRequest.password` 에 `@NotBlank` 가 붙으면 이 요청이 400 이 된다.
 *    현재는 붙어 있지 않다(import 만 남아 있고 미사용). 검증을 손볼 일이 생기면
 *    "password 는 LOCAL 에서만 필수" 라는 조건을 유지해야 한다.
 *
 * userApi 를 쓰지 않는 이유: 이 API 의 401 은 "토큰 인증 실패"와
 * "비밀번호 불일치"를 구분하지 않는다. userApi 인터셉터는 401 을 보면
 * 재발급 → 재시도 → 또 401 이면 로그인 화면으로 리다이렉트해 버려서,
 * 비밀번호를 잘못 입력한 사용자가 로그아웃당하는 사고가 난다.
 * 그래서 인터셉터 없는 publicApi 에 토큰을 직접 실어 보내고,
 * 재발급·재시도·판정을 아래 requestWithdraw 가 직접 관리한다.
 */
async function attemptWithdraw(
  password: string | null,
  token: string,
): Promise<void> {
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
 *     - 2차 401   → 비밀번호를 보낸 경우라면 불일치로 판정
 *   재발급 자체가 실패하면 세션이 끝난 것이므로 그대로 던진다.
 *     (에러의 요청 경로가 withdraw 가 아니라서 비밀번호 문구로 오인되지 않는다)
 */
async function requestWithdraw(password: string | null): Promise<void> {
  const token = useAuthStore.getState().accessToken.user ?? ''

  try {
    await attemptWithdraw(password, token)
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error

    const freshToken = await refreshAccessToken('user')
    await attemptWithdraw(password, freshToken)
  }
}

/**
 * 에러를 i18n 키로 바꾼다.
 *
 * withdraw 요청의 401 은 두 가지 뜻이 겹쳐 있다(BE 가 PASSWORD_MISMATCH 와
 * 토큰 인증 실패에 같은 401 을 쓴다). 그래서 **비밀번호를 보낸 경우에만**
 * 불일치로 판정한다 — 구글 가입자는 비밀번호를 입력한 적조차 없으므로
 * "비밀번호가 틀렸습니다" 를 띄우면 안 되고, 그 401 은 세션 문제다.
 */
function toWithdrawErrorKey(error: unknown, hasPassword: boolean): string {
  const isWithdrawUnauthorized =
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.url === endpoints.users.withdraw

  if (!isWithdrawUnauthorized) return FALLBACK_ERROR_KEY

  return hasPassword ? WRONG_PASSWORD_KEY : SESSION_EXPIRED_KEY
}

export interface UseWithdrawResult {
  /**
   * 성공 여부를 반환한다. 성공 시 로컬 토큰까지 지운다.
   * 구글 가입자는 확인할 비밀번호가 없으므로 null 을 넘긴다.
   */
  withdraw: (password: string | null) => Promise<boolean>
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
    async (password: string | null) => {
      setIsPending(true)
      setErrorKey(null)

      try {
        await requestWithdraw(password)
        clearAccessToken('user')
        // 탈퇴한 계정으로 자동 재로그인되면 안 된다. (구글로 가입한 경우)
        disableGoogleAutoSelect()
        return true
      } catch (error) {
        setErrorKey(toWithdrawErrorKey(error, password !== null))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [clearAccessToken],
  )

  return { withdraw, isPending, errorKey }
}
