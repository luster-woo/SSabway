import { useCallback, useState } from 'react'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useAdminProfileStore } from '@/admin/features/auth/useAdminProfileStore'

export interface AdminLoginRequest {
  staffCode: string
  staffPassword: string
}

export interface AdminLoginResult {
  accessToken: string
  staffCode: string
}

/**
 * BE 개발 전이라 목 응답을 사용한다.
 * 연동 시 requestAdminLogin 본문만 교체하고 아래 상수는 삭제한다.
 */
const MOCK_STAFF_CODE = 'fjhiuozasld'
const MOCK_STAFF_PASSWORD = '12345'
const MOCK_LATENCY_MS = 600

/**
 * 로그인에서 마주칠 전역 에러코드 → 화면 문구.
 * (API 명세서 상단 에러코드 표: 401 UNAUTHORIZED, 403 FORBIDDEN)
 *
 * shared/types/api.ts 의 API_ERROR_CODE 는 화상 상담 전용 코드만 담고 있어
 * 전역 코드가 없다. 로그인에서 쓰는 두 개만 여기서 정의한다.
 */
const LOGIN_ERROR_CODE = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const

const ERROR_MESSAGE: Record<string, string> = {
  [LOGIN_ERROR_CODE.UNAUTHORIZED]:
    '관리자 코드 또는 비밀번호가 올바르지 않습니다.',
  [LOGIN_ERROR_CODE.FORBIDDEN]: '관리자 권한이 없습니다.',
}

const FALLBACK_MESSAGE = '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'

/** 에러의 code 를 화면 문구로 바꾼다. 모르는 코드면 공통 문구를 쓴다. */
function toErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  return ERROR_MESSAGE[code] ?? FALLBACK_MESSAGE
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestAdminLogin(
  body: AdminLoginRequest,
): Promise<AdminLoginResult> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체.
  //   사용자 로그인(useUserLogin)은 MSW 목 서버 + 실제 axios 호출로 옮겼다.
  //   관리자도 같은 방식으로 간다. handlers.ts 에 admins/login 핸들러를 추가하고
  //   여기서는 adminApi 를 호출하면 된다.
  //   주의: 응답 형태가 사용자와 다르다. 토큰이 data.token.accessToken 에 있다.
  //   const res = await adminApi.post<
  //     ApiResponse<{ token: { accessToken: string }; staffCode: string }>
  //   >(endpoints.admin.login, body)
  //   return {
  //     accessToken: res.data.data.token.accessToken,
  //     staffCode: res.data.data.staffCode,
  //   }
  await delay(MOCK_LATENCY_MS)

  const isValid =
    body.staffCode === MOCK_STAFF_CODE &&
    body.staffPassword === MOCK_STAFF_PASSWORD

  if (!isValid) throw new Error(LOGIN_ERROR_CODE.UNAUTHORIZED)

  return {
    accessToken: `mock.${String(Date.now())}`,
    staffCode: body.staffCode,
  }
}

export interface UseAdminLoginResult {
  /** 성공 여부를 반환한다. 화면 이동은 호출한 쪽에서 결정한다. */
  login: (body: AdminLoginRequest) => Promise<boolean>
  isPending: boolean
  errorMessage: string | null
}

/**
 * 관리자 로그인.
 *
 * 로그인은 캐시하거나 재조회할 서버 상태가 아니라 토큰을 받아오는 일회성 명령이므로
 * TanStack Query 를 쓰지 않는다. 요청 진행 상태만 로컬로 들고,
 * 결과인 액세스 토큰은 Zustand(useAuthStore) 에 저장한다.
 */
export function useAdminLogin(): UseAdminLoginResult {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setStaffCode = useAdminProfileStore((s) => s.setStaffCode)
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const login = useCallback(
    async (body: AdminLoginRequest) => {
      setIsPending(true)
      setErrorMessage(null)

      try {
        const result = await requestAdminLogin(body)
        setAccessToken('admin', result.accessToken)
        setStaffCode(result.staffCode)
        return true
      } catch (error) {
        setErrorMessage(toErrorMessage(error))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [setAccessToken, setStaffCode],
  )

  return { login, isPending, errorMessage }
}
