/**
 * 백엔드가 어디까지 만들었는지.
 *
 * 상담 도메인 API가 순차적으로 들어오는 동안, 프론트는 "있으면 쓰고 없으면
 * 임시 경로" 두 갈래를 유지해야 한다. 그 판단을 파일 곳곳의 TODO 주석이 아니라
 * 여기 한 곳에 모은다. BE 가 배포하면 해당 플래그를 true 로 바꾸고, 관련 코드의
 * false 분기를 지우면 된다.
 *
 * 환경변수로 빼지 않은 이유: 이건 배포 환경별 설정이 아니라 개발 진행 상황이다.
 * 커밋으로 남아야 "언제 무엇이 붙었는지"가 히스토리에 남는다.
 *
 * ⚠️ 플래그를 켤 때는 반드시 짝이 되는 임시 코드를 함께 지울 것.
 *    남겨두면 테스트되지 않는 죽은 분기가 된다.
 */
interface BackendReadyFlags {
  CONSULTATION_ACCEPT: boolean
  CONSULTATION_END: boolean
  CONSULTATION_STATUS: boolean
  ADMIN_QUEUE: boolean
  ERROR_CODES: boolean
}

/*
  `as const` 를 쓰지 않는 이유.

  붙이면 각 값이 리터럴 타입(false)으로 좁혀져서, 아직 안 켠 분기가 "도달 불가"로
  취급된다. 타입 검사도 린트도 그 코드를 죽은 코드로 보기 시작하므로,
  플래그를 켜기 전까지 반대편 분기의 오류를 잡아 주지 못한다.
*/
export const BACKEND_READY: BackendReadyFlags = {
  /**
   * `POST /api/v1/admin/consultations/{id}/accept`
   * 세션 생성 + 토큰 발급 + 녹음 시작 통합. (BE 작업 중)
   *
   * 켜면 지울 것 — shared/api/openvidu.ts 의 3-call 분기, toSessionId()
   */
  CONSULTATION_ACCEPT: false,

  /**
   * `POST /api/v1/admin/consultations/{id}/end`
   * 녹음 정지 + 세션 종료 + ENDED 전이 통합. (BE 작업 중)
   *
   * 켜면 지울 것 — endConsultation 의 recordingId null 분기
   */
  CONSULTATION_END: false,

  /**
   * `POST /api/v1/consultations` + `GET /api/v1/consultations/{id}`
   * 상담 요청과 상태 조회. 대기 순번(queuePosition)이 여기서 온다.
   *
   * 켜면 지울 것 — useConsultationMatch 의 세션 폴링 분기,
   *              ConsultationPage 의 ?consultationId= 쿼리 파싱
   */
  CONSULTATION_STATUS: false,

  /**
   * `GET /api/v1/admin/consultations?status=WAITING`
   * 역무원 대기 목록.
   *
   * 켜면 지울 것 — useWaitingConsultations 의 MOCK_WAITING,
   *              mockAcceptedIds 와 markMockAccepted/isMockAccepted
   */
  ADMIN_QUEUE: false,

  /**
   * `@RestControllerAdvice` + 명세 에러코드 6종.
   * 지금은 모든 예외가 500 이라 "아직 매칭 안 됨"과 서버 장애를 구분할 수 없다.
   *
   * 켜면 좁힐 것 — shared/api/openvidu.ts 의 isSessionNotReady()
   */
  ERROR_CODES: false,
}
