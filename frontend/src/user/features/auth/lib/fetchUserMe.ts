import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'
import type { UserMe } from '@/shared/types/user'

/**
 * 로그인한 사용자의 개인 정보를 조회한다. ✅ BE 개발완료 (UserController.getMe)
 *
 *   GET /api/v1/users/me   → { email, provider, language }
 *
 * 회원 탈퇴 흐름에서만 부른다. 탈퇴 모달이 필요한 두 가지가 여기서만 나온다.
 *   provider — 비밀번호를 물어볼지 말지 (구글 가입자는 비밀번호가 없다)
 *   email    — "어느 계정을 지우는지" 확인 문구
 *
 * `userApi` 를 쓰는 이유: 이 API 의 401 은 순수하게 토큰 문제다(SecurityConfig 가
 * `/api/v1/users/**` 를 hasAuthority("USER") 로 막는다). 비밀번호 대조가 없어
 * 401 의 뜻이 갈리지 않으므로, 재발급·재시도는 인터셉터에 맡기는 것이 맞다.
 * 같은 이유로 탈퇴 요청(PATCH /users)은 반대로 publicApi 를 쓴다 — useWithdraw 참고.
 */
export async function fetchUserMe(): Promise<UserMe> {
  const res = await userApi.get<ApiResponse<UserMe>>(endpoints.users.me)

  return res.data.data
}
