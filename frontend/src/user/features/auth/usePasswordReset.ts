import { useCallback, useState } from 'react'

import {
  MockHttpError,
  toErrorKey,
} from '@/user/features/auth/lib/mockHttpError'

export interface PasswordResetBody {
  /**
   * 명세의 요청 본문에는 newPassword 하나만 있다.
   * 하지만 그 엔드포인트는 401(액세스 토큰 인증 실패)을 반환하는 "로그인한 회원의
   * 비밀번호 변경"이라, 로그인하지 않은 사용자의 재설정에는 그대로 쓸 수 없다.
   * 재설정 전용 엔드포인트가 확정되면 email 또는 인증 토큰을 함께 보내야 한다.
   */
  email: string
  newPassword: string
}

const RESET_ERROR_KEY: Record<number, string> = {
  400: 'auth.passwordReset.error.invalidPassword',
  401: 'auth.passwordReset.error.unauthorized',
}

const FALLBACK_ERROR_KEY = 'auth.passwordReset.error.resetFailed'

const MOCK_LATENCY_MS = 600

/**
 * 목이 통과시킬 최소 길이. 회원가입 목과 같은 값을 쓴다.
 *
 * 프론트에서 길이를 검사하지 않는 이유는 이메일 형식을 검사하지 않는 것과 같다.
 * 판정을 서버 한 곳에만 두고, 명세에 비밀번호 규칙이 확정되지 않았다.
 * 8 은 화면 안내 문구("8자 이상 입력") 기준이며, BE 규칙이 정해지면 그것을 따른다.
 */
const MOCK_MIN_PASSWORD_LENGTH = 8

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestPasswordReset(body: PasswordResetBody): Promise<void> {
  // TODO: 재설정 전용 엔드포인트 확정 후 실제 호출로 교체.
  //   명세의 PUT /api/v1/users 는 액세스 토큰이 필요한 "비밀번호 변경"이라
  //   비로그인 재설정에는 쓸 수 없다. BE 확인 필요.
  //   await userApi.put(endpoints.users.changePassword, {
  //     newPassword: body.newPassword,
  //   })
  await delay(MOCK_LATENCY_MS)

  if (body.newPassword.length < MOCK_MIN_PASSWORD_LENGTH) {
    throw new MockHttpError(400)
  }
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
