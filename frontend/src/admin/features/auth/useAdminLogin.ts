import { useCallback, useState } from 'react'
import axios from 'axios'

import { adminApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { ApiResponse } from '@/shared/types/api'
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
 * 관리자 로그인 응답의 data 부분. (API 명세 기준)
 * 응답 봉투는 { success, message, data } 이고, data 에 토큰이 평평하게 담긴다.
 */
interface AdminLoginData {
  accessToken: string
  staffCode: string
}

/**
 * 로그인에서 마주칠 전역 에러코드 → 화면 문구. HTTP 상태코드로 분기한다.
 * (API 명세서 상단 에러코드 표: 401 UNAUTHORIZED, 403 FORBIDDEN)
 */
const ERROR_MESSAGE: Record<number, string> = {
  401: '관리자 코드 또는 비밀번호가 올바르지 않습니다.',
  403: '관리자 권한이 없습니다.',
}

const FALLBACK_MESSAGE = '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'

/** axios 에러의 HTTP 상태를 화면 문구로 바꾼다. 모르는 상태면 공통 문구를 쓴다. */
function toErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  const message = status === undefined ? undefined : ERROR_MESSAGE[status]
  return message ?? FALLBACK_MESSAGE
}

async function requestAdminLogin(
  body: AdminLoginRequest,
): Promise<AdminLoginResult> {
  // 명세상 요청 본문 필드는 { staffCode, password } 다. (staffPassword 가 아니다)
  const res = await adminApi.post<ApiResponse<AdminLoginData>>(
    endpoints.admin.login,
    { staffCode: body.staffCode, password: body.staffPassword },
  )
  return {
    accessToken: res.data.data.accessToken,
    staffCode: res.data.data.staffCode,
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
 * 결과인 액세스 토큰은 Zustand(useAuthStore) 의 admin 슬롯에 저장한다.
 * (사용자 쪽 useUserLogin 과 같은 구조)
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
