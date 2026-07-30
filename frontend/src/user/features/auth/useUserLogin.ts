import { useCallback, useState } from 'react'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'

export interface UserLoginRequest {
  email: string
  password: string
}

/**
 * 로그인에서 마주칠 전역 에러코드 → i18n 키.
 * (API 명세서 상단 에러코드 표: 401 UNAUTHORIZED, 403 FORBIDDEN)
 */
const LOGIN_ERROR_CODE = {
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const

const ERROR_KEY: Record<string, string> = {
  [LOGIN_ERROR_CODE.UNAUTHORIZED]: 'auth.login.error.invalidCredential',
}

const FALLBACK_ERROR_KEY = 'auth.login.error.unknown'

/** 에러의 code 를 i18n 키로 바꾼다. 모르는 코드면 공통 문구를 쓴다. */
function toErrorKey(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  return ERROR_KEY[code] ?? FALLBACK_ERROR_KEY
}

/**
 * BE 개발이 끝나지 않아 목 응답을 사용한다.
 * 연동 시 requestLogin 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_EMAIL = 'user1@mail.com'
const MOCK_PASSWORD = 'example1'
const MOCK_LATENCY_MS = 600

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestLogin(body: UserLoginRequest): Promise<string> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체.
  //   실패 응답의 code 를 Error.message 로 옮겨 던지면 toErrorKey 가 문구로 바꿔준다.
  //   const res = await userApi.post<ApiResponse<{ token: { accessToken: string } }>>(
  //     endpoints.users.login, body,
  //   )
  //   return res.data.data.token.accessToken
  await delay(MOCK_LATENCY_MS)

  const isValid = body.email === MOCK_EMAIL && body.password === MOCK_PASSWORD
  if (!isValid) throw new Error(LOGIN_ERROR_CODE.UNAUTHORIZED)

  return `mock.${String(Date.now())}`
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
 */
export function useUserLogin(): UseUserLoginResult {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const login = useCallback(
    async (body: UserLoginRequest) => {
      setIsPending(true)
      setErrorKey(null)

      try {
        const accessToken = await requestLogin(body)
        setAccessToken('user', accessToken)
        return true
      } catch (error) {
        setErrorKey(toErrorKey(error))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [setAccessToken],
  )

  return { login, isPending, errorKey }
}
