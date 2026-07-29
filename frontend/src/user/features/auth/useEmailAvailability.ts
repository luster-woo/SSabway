import { useCallback, useState } from 'react'

import {
  MockHttpError,
  toErrorKey,
} from '@/user/features/auth/lib/mockHttpError'

/** 중복 확인 결과. 아직 확인하지 않았으면 UNCHECKED. */
export const EMAIL_CHECK = {
  UNCHECKED: 'unchecked',
  AVAILABLE: 'available',
  DUPLICATE: 'duplicate',
} as const

export type EmailCheck = (typeof EMAIL_CHECK)[keyof typeof EMAIL_CHECK]

const CHECK_ERROR_KEY: Record<number, string> = {
  400: 'auth.signUp.error.invalidEmail',
}

const FALLBACK_ERROR_KEY = 'auth.signUp.error.checkFailed'

const MOCK_LATENCY_MS = 500
/** 이 이메일들만 이미 가입된 것으로 취급한다. */
const MOCK_TAKEN_EMAILS = ['user1@mail.com', 'test@mail.com']

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 중복이면 true. 명세의 isDuplicate 를 그대로 돌려준다. */
async function requestEmailExists(email: string): Promise<boolean> {
  // TODO: BE 연동 시 실제 호출로 교체. (이 엔드포인트는 개발완료 상태)
  //   const res = await userApi.get<ApiResponse<{ isDuplicate: boolean }>>(
  //     endpoints.users.exists(email),
  //   )
  //   return res.data.data.isDuplicate
  await delay(MOCK_LATENCY_MS)

  if (!email.includes('@')) throw new MockHttpError(400)

  return MOCK_TAKEN_EMAILS.includes(email.toLowerCase())
}

export interface UseEmailAvailabilityResult {
  status: EmailCheck
  isChecking: boolean
  /** 실패 문구의 i18n 키. 없으면 null */
  errorKey: string | null
  /** 사용 가능하면 true. 중복이거나 실패하면 false */
  check: (email: string) => Promise<boolean>
  /** 이메일을 다시 고치면 확인 결과를 무효로 만든다. */
  reset: () => void
}

/**
 * 이메일 중복 확인.
 *
 * 조회지만 TanStack Query 를 쓰지 않는다. 화면에 들어오면 자동으로 불러올 값이
 * 아니라 사용자가 버튼을 눌러 한 번 확인하는 동작이고, 캐시해 두면
 * 이메일을 고친 뒤에도 이전 결과가 남아 잘못된 통과를 만들 수 있다.
 */
export function useEmailAvailability(): UseEmailAvailabilityResult {
  const [status, setStatus] = useState<EmailCheck>(EMAIL_CHECK.UNCHECKED)
  const [isChecking, setIsChecking] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const check = useCallback(async (email: string) => {
    setIsChecking(true)
    setErrorKey(null)

    try {
      const isDuplicate = await requestEmailExists(email)
      setStatus(isDuplicate ? EMAIL_CHECK.DUPLICATE : EMAIL_CHECK.AVAILABLE)
      if (isDuplicate) setErrorKey('auth.signUp.error.duplicateEmail')
      return !isDuplicate
    } catch (error) {
      setStatus(EMAIL_CHECK.UNCHECKED)
      setErrorKey(toErrorKey(error, CHECK_ERROR_KEY, FALLBACK_ERROR_KEY))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  const reset = useCallback(() => {
    setStatus(EMAIL_CHECK.UNCHECKED)
    setErrorKey(null)
  }, [])

  return { status, isChecking, errorKey, check, reset }
}
