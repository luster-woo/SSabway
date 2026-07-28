export interface ApiResponse<T> {
  data: T
  message: string
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
