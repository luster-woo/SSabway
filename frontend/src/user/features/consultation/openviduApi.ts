import { userApi } from '@/shared/api/client'
import { createOpenViduApi } from '@/shared/api/openvidu'

/**
 * 사용자 앱이 쓰는 signaling 서버 클라이언트.
 *
 * 관리자 앱과 인스턴스를 나누는 이유는 401 처리다. userApi 는 사용자 토큰으로
 * 재발급하고 실패하면 `/login` 으로 보낸다. 관리자용을 잘못 쓰면 여행객이
 * 관리자 로그인 화면으로 떨어진다.
 */
export const openviduApi = createOpenViduApi(userApi)
