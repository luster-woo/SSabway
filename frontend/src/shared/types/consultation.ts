/** 상태 전이: WAITING → MATCHED → IN_PROGRESS → ENDED (이탈 시 CANCELED / FAILED) */
export const CONSULTATION_STATUS = {
  WAITING: 'WAITING', // 대기열 등록됨
  MATCHED: 'MATCHED', // 역무원 배정, 아직 미접속
  IN_PROGRESS: 'IN_PROGRESS', // 양측 접속 완료
  RECONNECTING: 'RECONNECTING', // 일시 끊김, 유예 시간 내
  ENDED: 'ENDED', // 정상 종료
  CANCELED: 'CANCELED', // 사용자가 대기 중 취소
  FAILED: 'FAILED', // 연결 실패 / 유예 초과
} as const

export type ConsultationStatus =
  (typeof CONSULTATION_STATUS)[keyof typeof CONSULTATION_STATUS]

export const SUMMARY_STATUS = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const

export type SummaryStatus = (typeof SUMMARY_STATUS)[keyof typeof SUMMARY_STATUS]

export const END_REASON = {
  NORMAL: 'NORMAL',
  USER_DISCONNECT: 'USER_DISCONNECT',
  STAFF_DISCONNECT: 'STAFF_DISCONNECT',
  TIMEOUT: 'TIMEOUT',
  ERROR: 'ERROR',
} as const

export type EndReason = (typeof END_REASON)[keyof typeof END_REASON]

export interface Consultation {
  consultationId: number
  requesterUserId: number | null
  status: ConsultationStatus
  startedAt: string
  endedAt: string | null
  endReason: EndReason | null
  recordId: string | null
  summaryStatus: SummaryStatus | null
  summary: string | null
}

/**
 * OpenVidu v2 세션 접속 정보. 토큰에 서버 주소가 포함되어 url 불필요.
 *
 * recordingId 는 여기 없다 — 서버가 consultations.record_id 로 보관하고
 * 종료(end) 시 스스로 조회하므로 프론트가 알 필요가 없다. (7/31 백엔드 반영)
 */
export interface ConsultationSession {
  consultationId: number
  sessionId: string
  token: string
}

/**
 * 세션 참가자 구분.
 *
 * 백엔드가 대소문자를 정규화한 뒤 USER/STAFF 외에는 400 으로 거절하고,
 * 역할별 1명 초과 접속은 409 로 거절한다. (OpenViduService.createConnection)
 */
export const PARTICIPANT_ROLE = {
  USER: 'user',
  STAFF: 'staff',
} as const

export type ParticipantRole =
  (typeof PARTICIPANT_ROLE)[keyof typeof PARTICIPANT_ROLE]

/**
 * `Connection.data` 에 실려 오는 JSON.
 *
 * 키 이름은 백엔드 문자열 템플릿과 1:1로 맞춰야 한다.
 * 요청 바디는 `role`(소문자 허용)인데 data 에는 정규화된 대문자
 * `participantType` 으로 들어가므로 헷갈리기 쉽다.
 */
export interface ConnectionData {
  participantId: string
  participantType: 'USER' | 'STAFF'
}

/**
 * `GET /api/v1/consultations/{consultationId}` 응답. — ⚠️ BE 미구현
 *
 * 사용자가 3초 간격으로 폴링해 매칭 여부를 확인한다.
 * BACKEND_READY.CONSULTATION_STATUS 가 켜지면 이 타입이 실제로 쓰인다.
 */
export interface ConsultationSnapshot {
  consultationId: number
  status: ConsultationStatus
  /** WAITING 일 때만 채워진다. 1부터 시작 */
  queuePosition: number | null
  /** MATCHED 이후 배정된 역무원명 */
  staffName: string | null
  requestedAt: string
  startedAt: string | null
}

/**
 * `POST /api/v1/openvidu/sessions/{sessionId}/end` 응답 (백엔드 실제 구현).
 *
 * S3 업로드와 AI 요약은 OpenVidu 웹훅 이후 비동기로 진행되므로,
 * 이 응답이 왔다고 녹음 파일이 준비된 것은 아니다. 이미 종료된 상담에
 * 재요청해도 성공(ended: true)으로 온다 — 재클릭에 안전하다.
 */
export interface EndResult {
  consultationId: number
  sessionId: string
  ended: boolean
}

export interface Blacklist {
  blacklistId: number
  userId: number
  staffId: number
  reason: string
  registeredAt: string
  releasedAt: string | null
}
