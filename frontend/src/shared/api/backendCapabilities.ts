interface BackendReadyFlags {
  ADMIN_QUEUE: boolean
  ROUTE_GUIDE: boolean
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

  /**
   * `POST /api/v1/routes/navi` — 역 내 단계별 경로 안내.
   *
   *    그런데도 이 플래그를 켜지 못하는 이유는 "BE 가 없어서"가 아니라
   *    프론트 계약이 어긋나 있어서다.
   *      - `fetchRouteGuide` 가 **본문 없이** POST 한다. BE 는 startPoint·
   *        finalPoint·readyToGo·langCode 가 @NotNull 이라 그대로면 400 이다.
   *      - 응답 형태가 다르다. FE `GuideStep.sign`(exitNumber·title·direction…)
   *        에 대응하는 것이 BE 에는 `imageUrl` 문자열 하나뿐이고,
   *        `instruction` 은 `text`(nullable)다. 지금 붙이면 SignBoardCard 가
   *        `sign.photoUrl` 에서 TypeError 를 낸다.
   *      - 애초에 `startPoint`(역 내 노드 id)를 만들 방법이 프론트에 없다.
   *        표지판 인식(`POST /routes/sign`)이 그 유일한 공급원인데 양쪽 다 미구현이다.
   *
   *    즉 켜기 전에 `shared/types/routeGuide.ts` 를 BE DTO 기준으로 다시 쓰고
   *    출발 지점 스토어를 만들어야 한다. `/routes/path` 는 그 작업을 먼저 끝낸
   *    선례다 — 참고할 것.
   *
   * false 인 동안 `fetchRouteGuide` 는 HTTP 를 아예 보내지 않고
   * `MOCK_ROUTE_GUIDE` 를 돌려준다. 배포 환경에는 MSW 가 없어서
   * (main.tsx 의 `IS_DEV && env.USE_MSW` 이중 게이트) HTTP 를 보내면 화면이
   * 실패 상태에 갇히고 그 뒤 도움 요청·화상까지 막히기 때문이다.
   *
   * 연동 시: 위 세 가지를 정리하고 플래그를 true 로, 그 다음 mocks/handlers.ts 의
   * `POST /routes/navi` 목과 mockRouteGuide.ts 를 지운다.
   */
  ROUTE_GUIDE: false,
}
