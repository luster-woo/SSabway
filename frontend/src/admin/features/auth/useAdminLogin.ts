import { useMutation } from '@tanstack/react-query'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'

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

const INVALID_CREDENTIAL_MESSAGE =
  '관리자 코드 또는 비밀번호가 올바르지 않습니다.'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestAdminLogin(
  body: AdminLoginRequest,
): Promise<AdminLoginResult> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체
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

  if (!isValid) throw new Error(INVALID_CREDENTIAL_MESSAGE)

  return {
    accessToken: `mock.${String(Date.now())}`,
    staffCode: body.staffCode,
  }
}

/** 관리자 로그인. 성공 시 액세스 토큰을 admin 슬롯에 저장한다. */
export function useAdminLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  return useMutation({
    mutationFn: requestAdminLogin,
    onSuccess: (result) => {
      setAccessToken('admin', result.accessToken)
    },
  })
}
