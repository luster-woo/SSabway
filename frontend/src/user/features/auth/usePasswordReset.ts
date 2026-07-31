import { useCallback, useState } from 'react'
import { isAxiosError } from 'axios'

import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

export interface PasswordResetBody {
  /** 비로그인 요청이라 토큰이 없다. 서버는 email 로 인증 상태를 찾는다. (BE 확인) */
  email: string
  newPassword: string
}

const INVALID_PASSWORD_KEY = 'auth.passwordReset.error.invalidPassword'
const VERIFICATION_EXPIRED_KEY = 'auth.passwordReset.error.unauthorized'
const FALLBACK_ERROR_KEY = 'auth.passwordReset.error.resetFailed'

/**
 * 에러를 i18n 키로 바꾼다.
 *
 * BE 는 400 을 두 의미로 쓴다 — EMAIL_NOT_VERIFIED(인증 안 됨·만료)와
 * INVALID_INPUT_VALUE(비밀번호 형식). 상태코드만으로는 구분할 수 없어
 * 응답 본문의 code 필드로 가른다. (에러 응답: { success, code, message })
 *
 * 이 훅이 publicApi 를 쓰는 이유: 재설정은 비로그인 흐름이라 401 재시도나
 * 로그인 리다이렉트가 끼어들면 안 된다.
 */
function toResetErrorKey(error: unknown): string {
  if (!isAxiosError(error) || !error.response) return FALLBACK_ERROR_KEY

  const { code } = (error.response.data ?? {}) as { code?: string }

  if (code === 'EMAIL_NOT_VERIFIED') return VERIFICATION_EXPIRED_KEY
  if (error.response.status === 400) return INVALID_PASSWORD_KEY
  return FALLBACK_ERROR_KEY
}

async function requestPasswordReset(body: PasswordResetBody): Promise<void> {
  await publicApi.patch(endpoints.users.passwordReset, body)
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
      setErrorKey(toResetErrorKey(error))
      return false
    } finally {
      setIsPending(false)
    }
  }, [])

  return { reset, isPending, errorKey }
}
