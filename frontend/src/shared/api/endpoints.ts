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
   * 요청 본문은 `ConsultationCreateBody`, 응답은 `ConsultationCreated`.
   */
  create: '/consultations',
  /** 상태 폴링 (3초). 응답은 `ConsultationSnapshot` 타입 참고. STOMP 가 붙으면 폴백으로 남는다 */
  detail: (id: number) => `/consultations/${id}`,
  /**
   * 대기 취소 — ✅ BE 구현됨 (webrtc ConsultationController).
   * POST 이고 /cancel 이 붙는다 (초기안 DELETE /consultations/{id} 에서 변경).
   * 이미 취소된 상담은 재요청해도 성공. 응답 { consultationId, status }.
   */
  cancel: (id: number) => `/consultations/${id}/cancel`,
  /**
   * 사용자 쪽 상담 종료 — ✅ BE 구현됨 (8/4). 상태를 보고 서버가 알아서
   * 취소(WAITING·MATCHED)/종료(IN_PROGRESS)를 가르고, 종료 후 재호출은 멱등.
   * 요청자 본인 검증 있음. 응답 { consultationId, status }.
   */
  leave: (id: number) => `/consultations/${id}/leave`,
  /**
   * 상담 자막 → GMS 요약. ✅ BE 구현됨 (ssabway ConsultationSummaryService).
   *
   * 상담이 ENDED 여야 받아준다 — leave 가 끝난 뒤에 불러야 한다.
   * 이미 요약이 있으면 GMS 를 다시 부르지 않고 기존 것을 돌려주므로 재호출에 안전하다.
   * 요청자 본인만 호출할 수 있고(USER 토큰), 서버는 요약만 저장하고 자막 원문은 버린다.
   *
   * 본문 { transcripts: [{ speaker: 'USER'|'STAFF', text }] }
   * 제한 200문장 / 문장당 100자 / 전체 20,000자
   */
  summary: (id: number) => `/consultations/${id}/summary`,
} as const

/**
 * 화상 연결 — signaling 서버(ssabway_webrtc)의 실제 구현 (8/3 최신화 반영).
 *
 * 역무원 수락은 admin.accept(1-call) 가 세션 생성+토큰까지 처리하고,
 * 여기는 사용자 커넥션 → start(녹음+IN_PROGRESS) → end 만 남는다.
 * 호출 순서와 실패 처리는 `@/shared/api/openvidu` 가 책임진다. 화면에서 직접 부르지 말 것.
 * (구 3-call 의 `POST /openvidu/sessions` 와 `DELETE /openvidu/sessions/{id}` 는
 *  백엔드에 존재하지 않아 제거했다 — 8/3)
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
   * 진행 중 상담의 사용자 정보(이메일·출발지·목적지·언어) 단건 조회.
   * ⚠️ BE 신설 요청 상태 (8/4) — WaitingResponse 와 같은 필드로 제안.
   * 위의 consultationDetail(쿼리스트링, 녹취 조회용)과 다른 API 다.
   */
  consultationInfo: (id: number) => `/staffs/consultations/${id}`,
  /**
   * 진행 중 상담에서 사용자가 안내받고 있는 역 내 경로 + 지금 보고 있는 단계.
   *
   * ⚠️ BE 신설 요청 상태 (8/5). 지금은 목(mocks/handlers.ts)이 응답한다.
   *
   * 응답은 사용자 경로 상세 안내(POST /routes/navi)의 steps 에서 지도에 필요한
   * 세 필드(edgeId·from·to)만 남긴 것 + currentIndex 다. 역무원 화면이
   * 사용자와 같은 지도를 그리므로 필드가 갈리면 두 화면이 어긋난다.
   *
   * POST /routes/navi 를 역무원이 대신 부를 수는 없다 — 요청 파라미터
   * (startPoint·교통카드·현금 보유 등)가 전부 사용자 입력값이기 때문이다.
   */
  consultationRoute: (id: number) => `/staffs/consultations/${id}/route`,
  /**
   * 상담 수락 — ✅ BE 구현됨. ⚠️ 8/4 소유가 webrtc → **ssabway** 로 이동.
   * 상태 잠금 + 세션 생성 + 역무원 토큰 발급을 1-call 로 처리한다
   * (ssabway 가 webrtc 내부 API 를 호출해 세션을 만든다).
   * 응답 data 는 { consultationId, sessionId, token, status } 그대로이고,
   * 봉투가 ssabway ApiResponse(code 있음)로 바뀌었다. 녹음 시작은 별도(start).
   * nginx 는 다른 /staffs/** 와 같이 api 로 보내면 된다 (별도 블록 불필요).
   */
  accept: (id: number) => `/staffs/consultations/${id}/accept`,
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
