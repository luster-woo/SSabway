/**
 * 엔드포인트별 목 스위치 — 실서버 연동 테스트의 진입점.
 *
 * 연동 테스트 순서:
 *   1. `frontend/.env.local` 에 붙일 백엔드를 적는다 (커밋되지 않는다)
 *        VITE_PROXY_TARGET=https://www.ssabway.site
 *   2. 테스트할 엔드포인트만 false 로 끈다 → 그 요청만 실서버로 나간다
 *   3. 실서버 쪽에서 오류가 나면 다시 true 로 되돌린다
 *      — 핸들러는 남아 있으므로 다른 기능 테스트에 영향이 없다
 *
 * 이렇게 두는 이유: 연동 시점에 핸들러를 지워버리면, 실서버 오류가 났을 때
 * 되돌릴 목이 없어 그 엔드포인트에 얽힌 다른 화면 테스트까지 같이 막힌다.
 * 스위치는 켜고 끄는 것뿐이라 실패해도 즉시 원상복구된다.
 *
 * 전부 실서버로 보낼 때(=목 완전 종료)는 public/config.js 의 USE_MSW 를
 * false 로 두는 것이 빠르다. 이 파일은 "일부만 실서버" 단계를 위한 것이다.
 *
 * ⚠️ handlers.ts 에 핸들러를 추가하면 여기에도 같은 키를 추가할 것.
 *    키 형식은 `METHOD 경로` (BASE 제외). 빠뜨리면 콘솔 경고와 함께
 *    목이 유지된다(안전한 쪽으로 동작).
 */
const SWITCH = {
  // 사용자 — 회원
  'GET /users/exists': true,
  'POST /users/email/requests': true,
  'POST /users/email/verification': true,
  'POST /users': true,
  'PATCH /users': true, // 회원 탈퇴 (Soft Delete)
  'PATCH /users/language': true,

  // 사용자 — 비밀번호 재설정
  'POST /users/password/email/requests': true,
  'POST /users/password/email/verification': true,
  'PATCH /users/password': true,

  // 사용자 — 로그인 / 인증
  'POST /users/login': true,
  'POST /users/login/google': true,
  'POST /auth/logout': true,
  'POST /auth/refresh': true,

  // 경로
  'GET /routes/gps': true,
  'POST /routes/navi': true,

  // 상담 대기열 (BE 미구현 — 배포되면 셋을 함께 끄고 실연동 검증)
  'POST /consultations': true,
  'GET /consultations/:consultationId': true,
  'POST /consultations/:consultationId/token': true,

  // 관리자 — 상담 대기 목록 (BE 미구현. BACKEND_READY.ADMIN_QUEUE 를 켜야 호출됨)
  'GET /admin/consultations': true,

  /*
    화상연결(signaling) — ✅ BE 개발완료라 기본 OFF (실서버로 나간다).

    한 컴퓨터 user + admin 매칭 실험 때만 다섯 개를 함께 true 로 켠다.
    실험 절차는 handlers.ts 의 「화상연결(signaling)」 섹션 주석 참고.
    실험 후 반드시 false 로 되돌릴 것 — 켠 채로 두면 실서버 화상 테스트가
    조용히 가짜 토큰을 받는다.
  */
  'POST /openvidu/sessions': false,
  'POST /openvidu/sessions/:sessionId/connections': false,
  'POST /openvidu/sessions/:sessionId/start': false,
  'POST /openvidu/sessions/:sessionId/end': false,
  'DELETE /openvidu/sessions/:sessionId': false,
}

export type MockSwitchKey = keyof typeof SWITCH

/*
  리터럴 타입(true)으로 좁혀지지 않도록 boolean 으로 넓혀 내보낸다.
  좁혀지면 스위치를 끈 분기가 죽은 코드로 취급된다 — backendCapabilities.ts 와
  같은 이유. (`as const` 금지)
*/
export const MOCK_SWITCH: Record<MockSwitchKey, boolean> = SWITCH
