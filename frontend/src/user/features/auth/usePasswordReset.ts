import { useCallback, useState } from 'react'

import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { toErrorKey } from '@/user/features/auth/lib/mockHttpError'

export interface PasswordResetBody {
  /**
   * 명세의 요청 본문에는 newPassword 하나만 있지만 email 을 함께 보낸다.
   *
   * 재설정은 비로그인 요청이라 토큰이 없다. 서버가 "누구의 비밀번호인지"를
   * 알 방법은 이메일 인증 상태 조회뿐이고, 그 조회 키가 email 이다.
   * BE 가 재설정용으로 수정하면서 본문에 email 이 추가될 것으로 보고
   * 미리 맞춰둔다. 확정 명세가 다르면 이 타입과 requestPasswordReset 만 고친다.
   */
  email: string
  newPassword: string
}

/**
 * 실패 문구의 i18n 키. 상태코드를 키로 쓴다.
 *
 * 400: 형식 오류 (비밀번호 규칙 위반)
 * 401: 이메일 인증 만료 — 인증 완료 상태(30분)가 지나 처음부터 다시 해야 한다.
 *      재설정에서 401 은 "로그인이 필요하다"가 아니므로 이 훅은 인터셉터가 있는
 *      userApi 가 아니라 publicApi 를 쓴다. (userApi 면 토큰 재발급 → 실패 →
 *      로그인 화면 리다이렉트로 이어져 이 문구를 보여줄 수 없다)
 */
const RESET_ERROR_KEY: Record<number, string> = {
  400: 'auth.passwordReset.error.invalidPassword',
  401: 'auth.passwordReset.error.unauthorized',
}

const FALLBACK_ERROR_KEY = 'auth.passwordReset.error.resetFailed'

async function requestPasswordReset(body: PasswordResetBody): Promise<void> {
  await publicApi.put(endpoints.users.changePassword, body)
}

export interface UsePasswordResetResult {
  /** 성공 여부를 반환한다. 화면 이동은 호출한 쪽에서 결정한다. */
  reset: (body: PasswordResetBody) => Promise<boolean>
  isPending: boolean
  /** 실패 문구의 i18n 키. 없으면 null */
  errorKey: string | null
}

/**
 * 비밀번호 재설정.
 *
 * 로그인과 마찬가지로 캐시·재조회할 서버 상태가 아니라 일회성 명령이라
 * TanStack Query 를 쓰지 않고 요청 진행 상태만 로컬로 들고 있는다.
 *
 * 비밀번호 길이 등 형식 검증은 프론트에서 하지 않는다. 판정을 서버 한 곳에
 * 두기 위함이고, 명세에 비밀번호 규칙이 아직 확정되지 않았다.
 * (두 칸 불일치 검사만 화면에서 한다 — 서버가 알 수 없는 정보라서)
 */
export function usePasswordReset(): UsePasswordResetResult {
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const reset = useCallback(async (body: PasswordResetBody) => {
    setIsPending(true)
    setErrorKey(null)

    try {
      await requestPasswordReset(body)
      return true
    } catch (error) {
      setErrorKey(toErrorKey(error, RESET_ERROR_KEY, FALLBACK_ERROR_KEY))
      return false
    } finally {
      setIsPending(false)
    }
  }, [])

  return { reset, isPending, errorKey }
}
