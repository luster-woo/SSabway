import { useCallback, useState } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import type { ApiResponse } from '@/shared/types/api'
import { toLangCode, toLanguage } from '@/user/features/auth/lib/language'
import { toErrorKey } from '@/user/features/auth/lib/mockHttpError'

interface GoogleLoginRequest {
  /** 구글 SDK 가 준 ID Token(JWT) */
  idToken: string
  /**
   * 선호 언어. 명세에 "신규 가입 시에만 사용" 이라고 적혀 있다.
   *
   * 프론트는 이 요청이 가입인지 로그인인지 알 수 없으므로 항상 현재 앱 언어를
   * 보내고, 기존 회원이면 서버가 무시한다.
   */
  language: string
}

/**
 * 응답은 일반 로그인과 동일하다. (명세에 "일반 로그인과 동일" 로 명시)
 * 그래서 성공 처리도 useUserLogin 과 같은 모양을 유지한다.
 */
interface GoogleLoginData {
  accessToken: string
  language: string
}

/**
 * 실패 문구의 i18n 키.
 *
 * 명세에 상태코드 표가 비어 있어 일반 로그인 기준으로 잡았다.
 * 401 은 토큰 검증 실패(만료·서명 불일치·aud 불일치)를 포함한다.
 * BE 가 code 를 내려주면 그때 세분화한다.
 */
const GOOGLE_LOGIN_ERROR_KEY: Record<number, string> = {
  401: 'auth.login.error.googleRejected',
}

const FALLBACK_ERROR_KEY = 'auth.login.error.googleFailed'

async function requestGoogleLogin(
  body: GoogleLoginRequest,
): Promise<GoogleLoginData> {
  const res = await userApi.post<ApiResponse<GoogleLoginData>>(
    endpoints.users.googleLogin,
    body,
  )
  return res.data.data
}

export interface UseGoogleLoginResult {
  /** 성공 여부를 반환한다. 화면 이동은 호출한 쪽에서 결정한다. */
  login: (idToken: string) => Promise<boolean>
  isPending: boolean
  /** 실패 문구의 i18n 키. 성공·초기 상태면 null */
  errorKey: string | null
}

/**
 * 구글 로그인.
 *
 * 프론트는 로그인을 하지 않는다. 구글에서 받은 ID Token 을 서버에 전달할 뿐이고,
 * 서명 검증(공개키·aud·iss·exp)과 가입 여부 판정은 서버가 한다.
 *
 * 응답이 일반 로그인과 같으므로 성공 처리도 동일하다 — 토큰을 useAuthStore 의
 * user 슬롯에 넣고, 서버에 저장된 선호 언어로 화면 언어를 맞춘다.
 * 명세에 신규 가입 여부(isNewUser)가 없어 온보딩 분기는 하지 않는다.
 */
export function useGoogleLogin(): UseGoogleLoginResult {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const { language, changeLanguage } = useLanguage()
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const login = useCallback(
    async (idToken: string) => {
      setIsPending(true)
      setErrorKey(null)

      try {
        const data = await requestGoogleLogin({
          idToken,
          language: toLangCode(language),
        })
        setAccessToken('user', data.accessToken)

        const next = toLanguage(data.language)
        if (next) changeLanguage(next)

        return true
      } catch (error) {
        setErrorKey(
          toErrorKey(error, GOOGLE_LOGIN_ERROR_KEY, FALLBACK_ERROR_KEY),
        )
        return false
      } finally {
        setIsPending(false)
      }
    },
    [setAccessToken, language, changeLanguage],
  )

  return { login, isPending, errorKey }
}
