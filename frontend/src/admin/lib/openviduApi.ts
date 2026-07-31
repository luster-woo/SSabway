import { adminApi } from '@/shared/api/client'
import { createOpenViduApi } from '@/shared/api/openvidu'

/**
 * 관리자 앱이 쓰는 signaling 서버 클라이언트.
 *
 * adminApi 를 물려서 401 시 관리자 토큰으로 재발급하고 관리자 로그인으로 보낸다.
 * 사용자 앱은 같은 방식으로 userApi 를 물린 인스턴스를 따로 만든다.
 * (signaling 서버는 현재 permitAll 이라 토큰을 검사하지 않지만, 인증이 붙는 순간
 *  어느 인스턴스를 썼는지가 갈리므로 처음부터 나눠 둔다)
 */
export const openviduApi = createOpenViduApi(adminApi)
