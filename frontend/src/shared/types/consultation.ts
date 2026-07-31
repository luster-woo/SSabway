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
 * 백엔드가 상담 리소스 래퍼 없이 OpenVidu 원시 API를 그대로 노출하고 있어,
 * 세 번의 호출(sessions → connections → recordings) 결과를 프론트가 모아서 갖는다.
 * 래퍼(`POST /admin/consultations/{id}/accept`)가 생기면 이 모양 그대로 한 번에 받는다.
 */
export interface ConsultationSession {
  consultationId: number
  sessionId: string
  token: string
  /** 녹음 시작에 실패해도 통화는 진행한다. 그 경우 null */
  recordingId: string | null
}

/**
 * 세션 참가자 구분.
 *
 * 백엔드는 이 값을 검증하지 않고 connection.data 에 그대로 넣는다.
 * (OpenViduService.createConnection — OpenVidu 역할은 항상 PUBLISHER 고정)
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
 * 요청 바디는 `role` 인데 data 에는 `participantType` 으로 들어가므로 헷갈리기 쉽다.
 */
export interface ConnectionData {
  participantId: string
  participantType: ParticipantRole
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
 * `POST /api/v1/admin/consultations/{consultationId}/accept` 응답. — ⚠️ BE 작업 중
 *
 * 세션 생성·토큰 발급·녹음 시작을 서버가 한 번에 처리한 결과다.
 * 지금은 프론트가 세 번 호출해 같은 모양으로 조립한다. (shared/api/openvidu)
 */
export interface AcceptResult {
  consultationId: number
  sessionId: string
  token: string
  recordingId: string | null
  /** 녹음 시작 시각. REC 배지가 새로고침 후에도 정확하려면 필요하다. */
  startedAt: string | null
}

/**
 * `POST /api/v1/admin/consultations/{consultationId}/end` 응답. — ⚠️ BE 작업 중
 *
 * S3 업로드와 AI 요약은 OpenVidu 웹훅 이후 비동기로 진행되므로,
 * 이 응답이 왔다고 녹음 파일이 준비된 것은 아니다. summaryStatus 로 추적한다.
 */
export interface EndResult {
  consultationId: number
  status: 'ENDED'
  /** 서버가 OpenVidu 웹훅 기준으로 확정한 통화 시간(초) */
  durationSec: number | null
  summaryStatus: SummaryStatus
}

export interface Blacklist {
  blacklistId: number
  userId: number
  staffId: number
  reason: string
  registeredAt: string
  releasedAt: string | null
}
