import { useCallback, useState } from 'react'

import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import {
  toErrorKey,
  type ErrorKeyTable,
} from '@/user/features/auth/lib/mockHttpError'

export interface PasswordResetBody {
  /** 비로그인 요청이라 토큰이 없다. 서버는 email 로 인증 상태를 찾는다. (BE 확인) */
  email: string
  newPassword: string
}

const FALLBACK_ERROR_KEY = 'auth.passwordReset.error.resetFailed'

/**
 * 실패 문구의 i18n 키.
 *
 * BE 는 400 을 두 의미로 쓴다 — EMAIL_NOT_VERIFIED(인증 안 됨·만료)와
 * INVALID_INPUT_VALUE(비밀번호 형식). 상태코드만으로는 구분할 수 없어 code 로
 * 가른다. (이 훅이 원래부터 code 를 읽던 유일한 곳이었고, 이제 다른 인증 훅들도
 * 같은 방식으로 통일됐다 — lib/mockHttpError 의 toErrorKey)
 *
 * 이 훅이 publicApi 를 쓰는 이유: 재설정은 비로그인 흐름이라 401 재시도나
 * 로그인 리다이렉트가 끼어들면 안 된다.
 */
const RESET_ERROR_KEY: ErrorKeyTable = {
  byCode: {
    EMAIL_NOT_VERIFIED: 'auth.passwordReset.error.unauthorized',
    INVALID_INPUT_VALUE: 'auth.passwordReset.error.invalidPassword',
    USER_NOT_FOUND: 'auth.passwordReset.error.emailNotFound',
    SOCIAL_LOGIN_REQUIRED: 'auth.passwordReset.error.socialAccount',
  },
  byStatus: {
    400: 'auth.passwordReset.error.invalidPassword',
  },
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
 * 형식 검증은 화면(PasswordResetPage)이 lib/password 로 먼저 한 뒤 보낸다.
 * 한때 "판정을 서버 한 곳에 둔다"고 미뤄 뒀지만, BE 규칙이 확정된 지금은
 * (@Size(8,64) + @Pattern("^\\S+$")) 서버만 아는 상태가 오히려 손해다 —
 * 위반해도 400 INVALID_INPUT_VALUE 하나만 와서 무엇이 틀렸는지 알 수 없다.
 * 최종 판정은 여전히 서버가 하고, 이 훅은 그 400 을 문구로 옮기는 일만 한다.
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
