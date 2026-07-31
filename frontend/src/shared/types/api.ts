export interface ApiResponse<T> {
  data: T
  message: string
}

/**
 * 화상(signaling) 서버의 응답 봉투.
 *
 * ssabway 본 서버(`ApiResponse`)와 달리 `success` 가 하나 더 붙는다.
 * 두 서버가 각자 봉투를 정의해서 생긴 차이라 타입을 합치면 안 된다.
 * (com.ssafy.ssabway_webrtc.common.response.ApiResponse)
 */
export interface WebrtcApiResponse<T> {
  success: boolean
  data: T
  message: string | null
}

export const API_ERROR_CODE = {
  BLACKLISTED: 'BLACKLISTED', // 403 차단 사용자의 상담 요청
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED', // 409 다른 역무원이 먼저 수락
  INVALID_STATE: 'INVALID_STATE', // 409 불가능한 상태 전이
  SESSION_CLOSED: 'SESSION_CLOSED', // 410 종료된 상담에 토큰 요청
  TOKEN_REISSUE_EXCEEDED: 'TOKEN_REISSUE_EXCEEDED', // 429 재발급 한도 초과
  OPENVIDU_ERROR: 'OPENVIDU_ERROR', // 502 세션 생성 실패
} as const

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE]

export interface ApiErrorBody {
  code: ApiErrorCode | string
  message: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
