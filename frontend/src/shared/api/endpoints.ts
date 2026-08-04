/** 인증 (사용자·관리자 공통) */
const auth = {
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const

/** 사용자 */
const users = {
  signup: '/users',
  withdraw: '/users', // PATCH — 같은 경로의 POST 는 회원가입
  login: '/users/login',
  googleLogin: '/users/login/google',
  /** 회원가입용 이메일 인증. 가입된 이메일이면 409 — 재설정에는 못 쓴다. */
  emailRequest: '/users/email/requests',
  emailVerification: '/users/email/verification',
  /**
   * 비밀번호 재설정 3종 (BE PasswordController, 개발완료).
   *
   * 회원가입용 인증과 URL 트리부터 분리되어 있고 서버 저장소(Redis 키)도 다르다.
   * 발송·확인·실행 셋 다 재설정용을 써야 한다 — 하나라도 회원가입용과 섞으면
   * 서버가 인증 상태를 못 찾아 코드 불일치/미인증으로 실패한다.
   */
  passwordEmailRequest: '/users/password/email/requests',
  passwordEmailVerification: '/users/password/email/verification',
  passwordReset: '/users/password', // PATCH, body { email, newPassword }
  /**
   * 선호 언어 변경 (PATCH, 인증 필요). body { language: 'KO'|'EN'|'JA'|'ZH' }
   * 시작 페이지를 벗어날 때 변경분만 보낸다 — useSyncLanguageOnLeave 참고.
   */
  language: '/users/language',
  exists: (email: string) => `/users/exists?email=${encodeURIComponent(email)}`,
} as const

/** 경로 안내 */
const routes = {
  nearbyByGps: (lat: number, lng: number) =>
    `/routes/gps?latitude=${lat}&longitude=${lng}`,
  sign: '/routes/sign',
  navi: '/routes/navi',
  path: '/routes/path',
} as const

/**
 * 화상 상담 (사용자) — ⚠️ 같은 `/consultations` 아래인데 소유 서비스가 갈린다.
 * (8/4 백엔드 최신화 반영)
 *
 *   create        → ssabway(api).  상담 생성 = 대기열 등록
 *   detail/cancel → ssabway_webrtc(signaling). 상태 전이·조회
 *
 * `schema.sql` 의 consultations 테이블 주석이 정한 분업이다 — "ssabway 가
 * INSERT, webrtc 가 상태 전이". 한때 webrtc 에도 create 가 중복 구현돼 있었는데
 * 8/4 삭제되어 지금은 ssabway 단독이다.
 *
 * ⚠️ 그래서 nginx 라우팅이 경로 하나 차이로 갈린다 (deploy/nginx.conf 참고) —
 *      `= /api/v1/consultations`  → api
 *      `/api/v1/consultations/`   → signaling
 *    응답 봉투도 서버마다 달라서 ssabway 는 `code` 가 있고 webrtc 는 없다.
 *    (shared/types/api.ts 의 ApiResponse / WebrtcApiResponse)
 */
const consultations = {
  /**
   * 상담 요청 → WAITING 생성. ✅ BE 구현됨 (ssabway UserConsultationController).
   * 요청 본문은 `ConsultationCreateBody`(3필드 전부 필수), 응답은 `ConsultationCreated`.
   * 역무원은 서버가 departureStationId 로 자동 배정한다.
   */
  create: '/consultations',
  /** 상태 폴링 (3초). 응답은 `ConsultationSnapshot` 타입 참고. STOMP 가 붙으면 폴백으로 남는다 */
  detail: (id: number) => `/consultations/${id}`,
  /**
   * 대기 취소 — ✅ BE 구현됨 (webrtc ConsultationController).
   * POST 이고 /cancel 이 붙는다 (초기안 DELETE /consultations/{id} 에서 변경).
   * WAITING 에서만 취소 가능(그 외 409 CONSULTATION_CANCEL_NOT_ALLOWED),
   * 이미 취소된 상담은 재요청해도 성공. 응답 { consultationId, status }.
   *
   * ⚠️ 서버가 소유자를 검증하지 않는다(Authentication 을 받지 않음) — 상담 ID 만
   *    알면 남의 대기도 취소된다. 취소 버튼은 사용자 화면에서만 노출할 것.
   *    (BE 에 검증 추가 요청해 둔 상태)
   */
  cancel: (id: number) => `/consultations/${id}/cancel`,
  /** ⚠️ BE 미구현 — 목만 있다. useConsultationCall 의 leaveCall 주석 참고 */
  leave: (id: number) => `/consultations/${id}/leave`,
} as const

/**
 * 화상 연결 — signaling 서버(ssabway_webrtc)의 실제 구현 (8/3 최신화 반영).
 *
 * 역무원 수락은 admin.accept(1-call) 가 세션 생성+토큰까지 처리하고,
 * 여기는 사용자 커넥션 → start(녹음+IN_PROGRESS) → end 만 남는다.
 * 호출 순서와 실패 처리는 `@/shared/api/openvidu` 가 책임진다. 화면에서 직접 부르지 말 것.
 * (구 3-call 의 `POST /openvidu/sessions` 와 `DELETE /openvidu/sessions/{id}` 는
 *  백엔드에 존재하지 않아 제거했다 — 8/3)
 *
 * ⚠️ nginx 가 `/api/` 를 ssabway 로만 보내고 있어 배포 환경에서는 아직 404 다.
 *    `location /api/v1/openvidu/ { proxy_pass http://signaling:8080; }` 추가가 필요하다.
 */
const openvidu = {
  createConnection: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/connections`,
  /**
   * 상담 시작 — 녹음 시작 + WAITING→IN_PROGRESS + record_id 저장을 한 번에.
   * 양쪽 참가자가 접속된 뒤(사용자 streamCreated 이후) 역무원 쪽이 부른다.
   * 중복 호출은 멱등 처리된다.
   */
  start: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/start`,
  /** 녹음 정지 + 세션 종료 + ENDED 전이. recordingId 는 서버가 DB에서 찾는다. */
  endConsultation: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/end`,
} as const

/** 관리자 */
const admin = {
  login: '/staffs/login',
  /** 상담 대기 목록. ✅ BE 개발완료 (ConsultationController GET /staffs/waiting). */
  waiting: (page: number) => `/staffs/waiting?page=${page}`,
  /**
   * 민원 기록 목록. ✅ BE 개발완료 (ConsultationController GET /staffs/history).
   * useConsultationHistory 의 매핑 함수 주석 참고. 페이지는 1부터, 6건씩.
   */
  history: (page: number) => `/staffs/history?page=${page}`,
  /**
   * 원본 상담 내역(녹취) 조회. ✅ BE 개발완료 (ConsultationController.getDetail).
   *
   */
  consultationDetail: (id: number) => `/staffs/consultations?id=${id}`,
  /**
   * 상담 수락 — ✅ BE 구현됨. ⚠️ 8/4 소유가 webrtc → **ssabway** 로 이동.
   * 상태 잠금 + 세션 생성 + 역무원 토큰 발급을 1-call 로 처리한다
   * (ssabway 가 webrtc 내부 API 를 호출해 세션을 만든다).
   * 응답 data 는 { consultationId, sessionId, token, status } 그대로이고,
   * 봉투가 ssabway ApiResponse(code 있음)로 바뀌었다. 녹음 시작은 별도(start).
   * nginx 는 다른 /staffs/** 와 같이 api 로 보내면 된다 (별도 블록 불필요).
   */
  accept: (id: number) => `/staffs/consultations/${id}/accept`,
  /** 상담 종료 — 녹음 정지 + 세션 종료 + ENDED. ⚠️ BE 작업 중 */
  end: (id: number) => `/staffs/consultations/${id}/end`,
  blacklist: {
    list: (page: number) => `/staffs/blacklist?page=${page}`,
    create: '/staffs/blacklist',
    release: '/staffs/blacklist/release',
    updateReason: '/staffs/blacklist',
  },
} as const

/**
 * AI (백엔드 경유 — ssabway 가 AI 컨테이너로 프록시한다).
 * `/api/v1/ai/**` 는 permitAll 목록에 없어 로그인(USER) 토큰이 필요하다.
 */
const ai = {
  /** 표지판 인식 — ✅ BE 개발완료. multipart 필드명은 image 하나 */
  signPredict: '/ai/signs/predict',
} as const

export const endpoints = {
  auth,
  users,
  routes,
  consultations,
  openvidu,
  admin,
  ai,
} as const
