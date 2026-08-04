/**
 * ssabway 본 서버의 응답 봉투.
 * (com.ssafy.ssabway.global.common.ApiResponse — @JsonPropertyOrder 기준)
 *
 * `success` 와 `code` 는 BE 가 처음부터 내려주고 있었는데 이 타입에 없어서
 * 여러 훅이 `as { code?: string }` 로 캐스팅해 읽고 있었다. 캐스팅은 BE 가
 * 필드를 바꿔도 컴파일이 통과해 런타임에야 드러나므로 타입에 명시한다.
 *
 * `code` 는 실패 응답에만 실린다 — 성공 응답은 @JsonInclude(NON_NULL) 때문에
 * 키 자체가 빠진다. 반대로 실패 응답에는 `data` 가 빠진다. 그래서 실패 본문을
 * 읽을 때는 이 타입이 아니라 아래 `ApiErrorBody` 를 쓴다.
 */
export interface ApiResponse<T> {
  success: boolean
  /** 실패 응답에만 존재. ErrorCode enum 의 이름 그대로다. */
  code?: string
  message: string
  data: T
}

/**
 * 화상(signaling) 서버의 응답 봉투.
 *
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

/**
 * 실패 응답 본문.
 *
 * 성공 본문(`ApiResponse`)과 형태가 다르다 — `data` 가 빠지고 `code` 가 붙는다.
 * axios 에러의 `error.response.data` 를 읽을 때 쓴다.
 *
 * `code` 를 옵셔널로 둔 이유: webrtc(signaling) 봉투에는 code 필드 자체가 없다
 * (common/response/ApiResponse 가 success·data·message 3필드). 두 서버의 실패
 * 응답을 같은 타입으로 읽어야 해서 없는 쪽을 기준으로 맞췄다.
 * BE 가 webrtc 봉투를 통일하면 필수로 좁힐 수 있다.
 */
export interface ApiErrorBody {
  success?: false
  code?: ApiErrorCode | string
  message: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
