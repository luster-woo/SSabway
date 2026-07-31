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

/**
 * 화상 상담 에러 코드 — signaling 서버 ErrorCode enum 기준 (7/31 갱신).
 *
 * ⚠️ 백엔드 에러 응답이 아직 `{ success, data, message }` 뿐이라 이 코드가
 *    응답에 실리지 않는다(code 필드 추가 요청 중). 그 전까지 분기는 HTTP
 *    상태코드로 하고, 이 상수는 code 필드가 들어오는 즉시 쓸 수 있게 백엔드
 *    enum 이름과 1:1로 맞춰 둔다. (기존 7/27 명세 이름은 폐기)
 */
export const API_ERROR_CODE = {
  // 상담 — 409는 "이 상태에선 그 동작 불가"
  CONSULTATION_NOT_FOUND: 'CONSULTATION_NOT_FOUND', // 404
  CONSULTATION_NOT_WAITING: 'CONSULTATION_NOT_WAITING', // 409 이미 시작됨(선착순 패배 포함)
  CONSULTATION_NOT_IN_PROGRESS: 'CONSULTATION_NOT_IN_PROGRESS', // 409 진행 중이 아님
  // 세션·참여자
  OPENVIDU_SESSION_NOT_FOUND: 'OPENVIDU_SESSION_NOT_FOUND', // 404 아직 수락 전(사용자 폴링의 재시도 신호)
  PARTICIPANT_ALREADY_CONNECTED: 'PARTICIPANT_ALREADY_CONNECTED', // 409 같은 역할이 이미 접속
  PARTICIPANT_LIMIT_EXCEEDED: 'PARTICIPANT_LIMIT_EXCEEDED', // 409 1:1 초과
  OPENVIDU_COMMUNICATION_FAILED: 'OPENVIDU_COMMUNICATION_FAILED', // 502 OpenVidu 서버 장애
  // 녹음
  RECORDING_NOT_FOUND: 'RECORDING_NOT_FOUND', // 404
  RECORDING_STATUS_INVALID: 'RECORDING_STATUS_INVALID', // 409
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
