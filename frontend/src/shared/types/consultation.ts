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
 * `POST /api/v1/consultations` 요청 본문 (BE ssabway ConsultationCreateRequest).
 *
 * 변경 이력
 *   8/4 — `departureStationId` 삭제, 역 이름 두 개만 남음
 *   8/5 — **`stationId` 추가**. 경로 제공 응답의 `segments[0].stationId` 를 그대로 싣는다
 *
 * 역무원은 클라이언트가 지정하지 않는다 — 서버가 출발역을 기준으로 담당
 * 역무원을 찾아 배정한다. 역 이름은 `stations.name_ko` 와 정확 비교이고
 * (StaffRepository.findByDepartureStationName) 서버는 trim 만 하므로
 * "동대구"/"동대구역" 같은 표기 차이도 404 STAFF_NOT_FOUND 다.
 *
 * ⚠️ 그래서 `departure` 에는 **한국어 역 이름**을 넣어야 한다. 경로 응답의
 *    `firstStartStation` 은 사용자 언어로 번역된 표기라("Daegu Station")
 *    그대로 보내면 외국어 사용자만 조용히 404 가 된다. `firstStartStationKor`
 *    쪽을 쓸 것 — `SelectedRoute.departureStationKor` 가 그 값이다.
 *
 * ⚠️ 명세서의 Request 표에는 필드명이 `startStation`·`endStation` 으로 적혀
 *    있지만, 같은 문서의 JSON 예시와 실제 BE 는 `departure`·`destination` 이다.
 *    동작하는 쪽(예시·BE)에 맞춘다. 표가 갱신되면 이 주석도 정리할 것.
 *
 * 세 필드 모두 필수다(@NotNull / @NotBlank + @Size(255)). 하나라도 빠지면 400.
 */
export interface ConsultationCreateBody {
  /** 출발역 DB id (`stations.id`). 대구역 = 1 */
  stationId: number
  /** 출발역 — **한국어** 표기 */
  departure: string
  /** 도착역 — **한국어** 표기 */
  destination: string
}

/**
 * `POST /api/v1/consultations` 응답 (BE ConsultationCreateResponse).
 *
 * 역무원은 수락 시점에 화상 세션과 함께 확정되므로, 최초 등록 시
 * staffName·startedAt 은 항상 null 이다.
 */
export interface ConsultationCreated {
  consultationId: number
  status: ConsultationStatus
  /** 초기 대기 순번. 1부터 시작 */
  queuePosition: number | null
  staffName: string | null
  requestedAt: string
  startedAt: string | null
}

/**
 * `GET /api/v1/consultations/{consultationId}` 응답 (BE ConsultationStatusResponse).
 *
 * 사용자가 3초 간격으로 폴링해 매칭 여부와 대기 순번을 확인한다.
 * `ConsultationCreated` 와 달리 staffName 이 아니라 sessionId 를 준다 —
 * MATCHED 이후에만 채워지며, 이 값으로 바로 접속 커넥션을 발급받는다
 * (별도 발급 API 없음. `@/shared/api/openvidu` 의 joinSession 참고).
 */
export interface ConsultationSnapshot {
  consultationId: number
  status: ConsultationStatus
  /** WAITING 일 때만 채워진다. 1부터 시작 */
  queuePosition: number | null
  /** MATCHED 이후에만 채워진다 */
  sessionId: string | null
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
