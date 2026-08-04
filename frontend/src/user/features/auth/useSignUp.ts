import { useCallback, useState } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { Language } from '@/shared/types/user'
import {
  toErrorKey,
  type ErrorKeyTable,
} from '@/user/features/auth/lib/mockHttpError'

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

/**
 * 실패 문구의 i18n 키.
 *
 * ⚠️ 400 을 뭉개면 안 된다. BE 는 400 을 두 의미로 쓴다.
 *   INVALID_INPUT_VALUE  비밀번호 형식 위반 (8~64자, 공백 불가)
 *   EMAIL_NOT_VERIFIED   이메일 인증 상태가 만료됨 (서버 TTL 30분)
 *
 * 둘 다 "입력 형식이 올바르지 않아요" 로 보여주던 게 이 화면에서 가장 아픈
 * 버그였다. 인증을 마치고 폼을 채우다 30분이 지나면 EMAIL_NOT_VERIFIED 가
 * 오는데, 사용자는 비밀번호 형식이 문제라고 생각해 아무리 고쳐도 통과하지
 * 못하고 재인증이 필요하다는 사실을 알 길이 없었다.
 *
 * verifiedExpired 는 이미 있는 키다 — 프론트 타이머(30분)가 먼저 끝났을 때
 * 쓰던 문구를 서버 판정에도 그대로 재사용한다. 두 경로의 안내가 같아야 한다.
 */
const SIGNUP_ERROR_KEY: ErrorKeyTable = {
  byCode: {
    EMAIL_NOT_VERIFIED: 'auth.signUp.error.verifiedExpired',
    INVALID_INPUT_VALUE: 'auth.signUp.error.invalidPassword',
    EMAIL_DUPLICATED: 'auth.signUp.error.duplicateEmail',
  },
  byStatus: {
    400: 'auth.signUp.error.invalidForm',
    409: 'auth.signUp.error.duplicateEmail',
  },
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
