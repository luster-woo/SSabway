interface BackendReadyFlags {
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
 *   ROUTE_GUIDE: `POST /routes/navi` 실호출로 전환 (8/4). 요청 본문을 BE
 *     RouteRequest 기준으로 만들고(buildNaviRequest) 응답을 화면용으로
 *     옮기는(mapNaviResponse) 작업을 마쳐 목을 지웠다.
 *   CONSULTATION_STATUS: `POST /consultations` + `GET /consultations/{id}`
 *     상시 실호출로 전환 (8/3). useConsultationMatch 의 임시 세션 폴링 분기 제거.
 *     ⚠️ 단, 이 API 들은 백엔드가 `staffId` 를 nullable 로 바꾸는 것을 전제로
 *        한다 — 그 전환이 아직이면 `POST /consultations` 가 400 을 낸다.
 *        (`endpoints.ts` 의 consultations 블록 주석 참고)
 *
 * ⚠️ 플래그를 켤 때는 반드시 짝이 되는 임시 코드를 함께 지울 것.
 *    남겨두면 테스트되지 않는 죽은 분기가 된다.
 */
export const BACKEND_READY: BackendReadyFlags = {
  /**
   * `GET /api/v1/staffs/waiting?page=` — 역무원 대기 목록. ✅ BE 개발완료.
   *
   * true 면 실호출로 나간다. `useWaitingConsultations.ts` 의 MOCK_WAITING·
   * mockAcceptedIds 계열은 이제 도달하지 않는 죽은 폴백이다 — accept 가
   * 1-call 로 전환되며(8/3) markMockAccepted 호출도 사라졌다. 정리는 별도
   * 작업으로 남겨 둔다.
   */
  ADMIN_QUEUE: true,
}
