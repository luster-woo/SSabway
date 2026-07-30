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

/** OpenVidu v2 세션 접속 정보. 토큰에 서버 주소가 포함되어 url 불필요 */
export interface ConsultationSession {
  consultationId: number
  token: string
  /** 토큰 재발급 잔여 횟수 (한도 5회) */
  reissueRemaining: number
}

/**
 * 세션 참가자 구분.
 * 백엔드가 토큰 발급 시 connection.data 에 { role } 로 주입한다.
 * (얼굴 모자이크는 사용자 브라우저에서 canvas로 처리 후 publish한다)
 */
export const PARTICIPANT_ROLE = {
  USER: 'user',
  STAFF: 'staff',
} as const

export type ParticipantRole =
  (typeof PARTICIPANT_ROLE)[keyof typeof PARTICIPANT_ROLE]

export interface ConnectionData {
  role: ParticipantRole
}

export interface Blacklist {
  blacklistId: number
  userId: number
  staffId: number
  reason: string
  registeredAt: string
  releasedAt: string | null
}
