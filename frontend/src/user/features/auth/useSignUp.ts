import { useCallback, useState } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { Language } from '@/shared/types/user'
import { toErrorKey } from '@/user/features/auth/lib/mockHttpError'

export interface SignUpBody {
  email: string
  password: string
  /**
   * 선호 언어.
   *
   * 명세의 표기가 세 갈래여서(표는 ko/en/ja/zh, 예시 본문은 "ENG",
   * 이메일 인증 발송은 KO/EN/JA/ZH) 인증 발송과 같은 대문자 코드로 맞췄다.
   * BE 확인 후 필요하면 이 타입만 바꾸면 된다.
   */
  language: Uppercase<Language>
}

/** 명세에 적힌 상태코드를 그대로 옮겼다. */
const SIGNUP_ERROR_KEY: Record<number, string> = {
  400: 'auth.signUp.error.invalidForm',
  409: 'auth.signUp.error.duplicateEmail',
}

const FALLBACK_ERROR_KEY = 'auth.signUp.error.signUpFailed'

async function requestSignUp(body: SignUpBody): Promise<void> {
  await userApi.post(endpoints.users.signup, body)
}

export interface UseSignUpResult {
  /** 성공 여부를 반환한다. 화면 이동은 호출한 쪽에서 결정한다. */
  signUp: (body: SignUpBody) => Promise<boolean>
  isPending: boolean
  /** 실패 문구의 i18n 키. 없으면 null */
  errorKey: string | null
}

/**
 * 회원가입.
 *
 * 캐시·재조회할 서버 상태가 아니라 일회성 명령이라 TanStack Query 를 쓰지 않고
 * 요청 진행 상태만 로컬로 들고 있는다. (로그인·비밀번호 재설정과 같은 기준)
 *
 * 명세의 성공 응답에는 토큰이 없어 가입 직후 자동 로그인은 할 수 없다.
 * 그래서 이 훅은 토큰을 저장하지 않는다.
 */
export function useSignUp(): UseSignUpResult {
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const signUp = useCallback(async (body: SignUpBody) => {
    setIsPending(true)
    setErrorKey(null)

    try {
      await requestSignUp(body)
      return true
    } catch (error) {
      setErrorKey(toErrorKey(error, SIGNUP_ERROR_KEY, FALLBACK_ERROR_KEY))
      return false
    } finally {
      setIsPending(false)
    }
  }, [])

  return { signUp, isPending, errorKey }
}
