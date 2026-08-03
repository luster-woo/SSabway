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

  /*
    관리자(역무원) 로그인 — ✅ BE 개발완료.

    true  → 목 계정(data.ts 의 STAFF_ACCOUNT: ADMIN001 / example1)으로 로그인
    false → 실서버로 나간다 (.env.local 의 VITE_PROXY_TARGET 이 가리키는 곳).
            이때는 해당 백엔드 DB 에 실존하는 staff 계정이 필요하다.
  */
  'POST /staffs/login': true,

  // 경로
  'GET /routes/gps': true,
  'POST /routes/navi': true,

  /*
    상담 요청·상태·취소 — 셋 다 ✅ BE 구현완료지만 ⚠️ 아직 실서버로 못 붙는다.

    `POST /consultations`(ssabway)는 `departureStationId` 로 담당 역무원을
    찾는데, `deploy/db/schema.sql` 에 시드 INSERT 가 없어 `stations`·`staffs`
    가 비어 있다. 지금 false 로 내리면 404 STAFF_NOT_FOUND 만 받는다.
    (프론트가 보내는 값은 PROTOTYPE_STATION_ID — 시드의 실제 id 로 맞출 것)

    detail·cancel 은 webrtc 소유로 제약이 없지만, 애초에 요청을 만들 방법이
    없으니(create 가 막혀 있으니) 같이 목으로 둔다.

    시드 데이터가 들어오면 셋을 함께 false 로 내려 실연동 검증한다.
  */
  'POST /consultations': true,
  'GET /consultations/:consultationId': true,
  'POST /consultations/:consultationId/cancel': true,
  // ⚠️ leave 는 BE 미구현이라 끄면 404 다 (실서버에서는 상담이 활성으로 남아
  //    재요청이 409 로 막힌다 — BE 에 구현 요청해 둔 상태)
  'POST /consultations/:consultationId/leave': true,

  // 관리자 — 상담 대기 목록 (✅ BE 개발완료. BACKEND_READY.ADMIN_QUEUE 로 실호출)
  'GET /staffs/waiting': true,

  /*
    관리자 — 블랙리스트 4종 (✅ BE 개발완료).

    핸들러가 없던 동안에는 스위치도 없어서 이 요청만 항상 실서버로 나갔다.
    그래서 USE_MSW 를 켠 로컬에서도 등록·해제가 조용히 실패했다.
  */
  'POST /staffs/blacklist': true,
  'GET /staffs/blacklist': true,
  'POST /staffs/blacklist/release': true,
  'PATCH /staffs/blacklist': true,

  /*
    관리자 — 원본 상담 내역(녹취) 조회는 목을 두지 않는다. ✅ BE 개발완료.

    useConsultationRecord 가 항상 실호출하고 핸들러도 없으므로 요청이 그대로
    실서버로 나간다 (블랙리스트 4종과 같은 방식).
    ⚠️ 실서버 검증 시 상담 ID 는 로그인한 역무원 소유여야 한다. 남의 역 상담은
       없는 ID 와 똑같이 404 CONSULTATION_NOT_FOUND 로 온다.
  */

  /*
    화상연결(signaling) — ✅ BE 개발완료라 기본 OFF (실서버로 나간다).

    한 컴퓨터 user + admin 매칭 실험 때만 네 개를 함께 true 로 켠다.
    실험 절차는 handlers.ts 의 「화상연결(signaling)」 섹션 주석 참고.
    실험 후 반드시 false 로 되돌릴 것 — 켠 채로 두면 실서버 화상 테스트가
    조용히 가짜 토큰을 받는다.

    (구 3-call 의 'POST /openvidu/sessions' 와 'DELETE /openvidu/sessions/…' 는
     accept 1-call 전환으로 제거됨 — 8/3)
  */
  'POST /staffs/consultations/:consultationId/accept': true,
  'POST /openvidu/sessions/:sessionId/connections': true,
  'POST /openvidu/sessions/:sessionId/start': true,
  'POST /openvidu/sessions/:sessionId/end': true,
}

export type MockSwitchKey = keyof typeof SWITCH

/*
  리터럴 타입(true)으로 좁혀지지 않도록 boolean 으로 넓혀 내보낸다.
  좁혀지면 스위치를 끈 분기가 죽은 코드로 취급된다 — backendCapabilities.ts 와
  같은 이유. (`as const` 금지)
*/
export const MOCK_SWITCH: Record<MockSwitchKey, boolean> = SWITCH
