interface BackendReadyFlags {
  CONSULTATION_STATUS: boolean
  ADMIN_QUEUE: boolean
}

/*
  `as const` 를 쓰지 않는 이유.

  붙이면 각 값이 리터럴 타입(false)으로 좁혀져서, 아직 안 켠 분기가 "도달 불가"로
  취급된다. 타입 검사도 린트도 그 코드를 죽은 코드로 보기 시작하므로,
  플래그를 켜기 전까지 반대편 분기의 오류를 잡아 주지 못한다.
*/

/**
 * 백엔드가 어디까지 만들었는지.
 *
 * 상담 도메인 API가 순차적으로 들어오는 동안, 프론트는 "있으면 쓰고 없으면
 * 임시 경로" 두 갈래를 유지해야 한다. 그 판단을 파일 곳곳의 TODO 주석이 아니라
 * 여기 한 곳에 모은다. BE 가 배포하면 해당 플래그를 true 로 바꾸고, 관련 코드의
 * false 분기를 지우면 된다.
 *
 * 처리 완료되어 플래그를 지운 것들 —
 *   ERROR_CODES: GlobalExceptionHandler 도입으로 상시 적용 (7/31)
 *   CONSULTATION_ACCEPT / CONSULTATION_END: accept 통합안을 철회하고
 *     백엔드의 sessions → connections → start 3-call 로 확정 (7/31)
 *
 * ⚠️ 플래그를 켤 때는 반드시 짝이 되는 임시 코드를 함께 지울 것.
 *    남겨두면 테스트되지 않는 죽은 분기가 된다.
 */
export const BACKEND_READY: BackendReadyFlags = {
  /**
   * `POST /api/v1/consultations` + `GET /api/v1/consultations/{id}`
   * 상담 요청과 상태 조회. 대기 순번(queuePosition)이 여기서 온다.
   *
   * 목 준비됨 — mocks/consultationQueue.ts (8/1).
   * 로컬에서 이 플래그를 true 로 켜면 MSW 만으로 요청 → 순번 감소 → 매칭 →
   * 토큰 발급까지 확인할 수 있다. (가짜 토큰이라 화상 접속은 실패가 정상)
   *
   * BE 배포 시 실연동 절차:
   *   1. .env.local 에 VITE_PROXY_TARGET 지정
   *   2. mockSwitch.ts 의 상담 3종을 false 로
   *   3. 이 플래그를 true 로
   *
   * ⚠️ 이 플래그를 켠 채 커밋하려면(=BE 실배포 후) 아래 임시 코드를 함께 지울 것 —
   *    useConsultationMatch 의 세션 폴링 분기,
   *    ConsultationPage 의 ?consultationId= 쿼리 파싱.
   *    그 전까지 false 로 두는 이유: 배포 환경에는 MSW 가 없어서, 켜 두면
   *    실서버 404 로 상담 요청이 전부 실패 화면으로 빠진다.
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
}
