import { useCallback, useState } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import type { ApiResponse } from '@/shared/types/api'
import { toLanguage } from '@/user/features/auth/lib/language'
import { toErrorKey } from '@/user/features/auth/lib/mockHttpError'

export interface UserLoginRequest {
  email: string
  password: string
}

interface UserLoginData {
  accessToken: string
  /**
   * 서버에 저장된 선호 언어. 명세 예시는 "EN" 처럼 대문자다.
   *
   * Uppercase<Language> 로 좁히지 않는 이유는 이 값이 서버에서 오기 때문이다.
   * 타입으로 단정해도 실제로 다른 문자열이 오면 막을 수 없으므로,
   * string 으로 받아 toLanguage 에서 검사한다.
   */
  language: string
}

/**
 * 실패 문구의 i18n 키. 상태코드를 키로 쓴다.
 *
 * 401 은 명세의 LOGIN_FAILED(이메일·비밀번호 불일치)와 SOCIAL_LOGIN_REQUIRED
 * (소셜 로그인 필요)가 같이 쓰는 상태코드다. 실패 응답 본문에 code 필드가 없어
 * 지금은 둘을 구분할 수 없다. BE 가 code 를 내려주면 그때 나눈다.
 *
 * 400(형식 오류)은 화면에서 빈 값을 막고 있어 사실상 오지 않으므로 fallback 에 맡긴다.
 */
const LOGIN_ERROR_KEY: Record<number, string> = {
  401: 'auth.login.error.invalidCredential',
}

const FALLBACK_ERROR_KEY = 'auth.login.error.unknown'

async function requestLogin(body: UserLoginRequest): Promise<UserLoginData> {
  const res = await userApi.post<ApiResponse<UserLoginData>>(
    endpoints.users.login,
    body,
  )
  return res.data.data
}

export interface UseUserLoginResult {
  /** 성공 여부를 반환한다. 화면 이동은 호출한 쪽에서 결정한다. */
  login: (body: UserLoginRequest) => Promise<boolean>
  isPending: boolean
  /** 실패 문구의 i18n 키. 성공·초기 상태면 null */
  errorKey: string | null
}

/**
 * 사용자 로그인.
 *
 * 로그인은 캐시하거나 재조회할 서버 상태가 아니라 토큰을 받아오는 일회성 명령이므로
 * TanStack Query 를 쓰지 않는다. 요청 진행 상태만 로컬로 들고,
 * 결과인 액세스 토큰은 Zustand(useAuthStore) 의 user 슬롯에 저장한다.
 *
 * 응답의 language 로 화면 언어를 바꾼다. 기기에서 고른 언어보다 서버에 저장된
 * 선호 언어가 그 사용자의 의사에 가깝다고 보기 때문이다.
 */
export function useUserLogin(): UseUserLoginResult {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const { changeLanguage } = useLanguage()
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const login = useCallback(
    async (body: UserLoginRequest) => {
      setIsPending(true)
      setErrorKey(null)

      try {
        const { accessToken, language } = await requestLogin(body)
        setAccessToken('user', accessToken)

        const next = toLanguage(language)
        if (next) changeLanguage(next)

        return true
      } catch (error) {
        setErrorKey(toErrorKey(error, LOGIN_ERROR_KEY, FALLBACK_ERROR_KEY))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [setAccessToken, changeLanguage],
  )

  return { login, isPending, errorKey }
}
