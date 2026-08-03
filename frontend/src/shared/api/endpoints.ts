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
 * 화상 상담 (사용자) — ⚠️ 백엔드 미구현. BACKEND_READY.CONSULTATION_STATUS 참고.
 *
 * 노션 7/27 명세의 상담 리소스 API 다. 대기열·매칭·상태조회가 여기 걸려 있다.
 *
 * ⚠️ 이 경로들은 상담 상태(DB)와 OpenVidu 를 동시에 다뤄야 해서 signaling 서버에
 *    구현될 가능성이 높다. 그렇다면 nginx 가 `/api/v1/consultations/` 도
 *    signaling 으로 보내야 한다. BE 와 어느 모듈에 넣을지 먼저 합의할 것.
 */
const consultations = {
  /** 상담 요청 → WAITING 생성 */
  create: '/consultations',
  /** 상태 폴링 (3초). STOMP 가 붙으면 폴백으로 남는다 */
  detail: (id: number) => `/consultations/${id}`,
  /**
   * 대기 취소 — ✅ BE 구현됨 (webrtc ConsultationController, 8/1 코드 확인).
   * POST 이고 /cancel 이 붙는다 (초기안 DELETE /consultations/{id} 에서 변경).
   * WAITING 에서만 취소 가능(그 외 409 CONSULTATION_CANCEL_NOT_ALLOWED),
   * 이미 취소된 상담은 재요청해도 성공. 응답 { consultationId, status }.
   * ⚠️ webrtc 서버 구현이므로 nginx 가 /api/v1/consultations/ 를
   *    signaling 으로 보내야 한다 (아래 consultations 블록 주석과 같은 이슈).
   */
  cancel: (id: number) => `/consultations/${id}/cancel`,
  /** ⚠️ BE 미구현 */
  leave: (id: number) => `/consultations/${id}/leave`,
  /** 접속 토큰 발급·재발급 */
  token: (id: number) => `/consultations/${id}/token`,
} as const

/**
 * 화상 연결 — signaling 서버(ssabway_webrtc)의 실제 구현 (7/31 최신화 반영).
 *
 * 세션 생성 → 커넥션 → start(녹음+IN_PROGRESS) → end 의 흐름이며,
 * 호출 순서와 실패 처리는 `@/shared/api/openvidu` 가 책임진다. 화면에서 직접 부르지 말 것.
 *
 * ⚠️ nginx 가 `/api/` 를 ssabway 로만 보내고 있어 배포 환경에서는 아직 404 다.
 *    `location /api/v1/openvidu/ { proxy_pass http://signaling:8080; }` 추가가 필요하다.
 */
const openvidu = {
  createSession: '/openvidu/sessions',
  createConnection: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/connections`,
  /**
   * 상담 시작 — 녹음 시작 + WAITING→IN_PROGRESS + record_id 저장을 한 번에.
   * 양쪽 참가자가 접속된 뒤(사용자 streamCreated 이후) 역무원 쪽이 부른다.
   * 중복 호출은 멱등 처리된다.
   */
  start: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/start`,
  /**
   * 세션 정리(수락 실패 롤백용).
   * ⚠️ 백엔드에서 제거됐다가 재추가 합의됨(7/31) — 배포 전까지 404 가능.
   */
  closeSession: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}`,
  /** 녹음 정지 + 세션 종료 + ENDED 전이. recordingId 는 서버가 DB에서 찾는다. */
  endConsultation: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/end`,
} as const

/** 관리자 */
const admin = {
  login: '/staffs/login',
  /** 상담 대기 목록. ✅ BE 개발완료 (ConsultationController GET /staffs/waiting). */
  waiting: (page: number) => `/staffs/waiting?page=${page}`,
  history: (page: number) => `/staffs/history?page=${page}`,
  /**
   * 원본 상담 내역(녹취) 조회. ✅ BE 개발완료 (ConsultationController.getDetail).
   *
   * 응답 data 는 { email, summary, recordUrl, expiresIn } 네 개다.
   * ⚠️ 노션 명세 「Response」 표의 `S3_path` 는 실제 응답에 없다 — 표가 낡았고
   *    같은 문서의 예시 JSON 이 백엔드와 일치한다. useConsultationRecord 주석 참고.
   * ⚠️ 이름이 detail 이지만 상담방에 필요한 departure/destination/language 는
   *    주지 않는다. 상담방 정보(useConsultationDetail)에 이 경로를 쓰지 말 것.
   */
  consultationDetail: (id: number) => `/staffs/consultations?id=${id}`,
  /**
   * 상담 수락 — 세션 생성 + 토큰 발급 + 녹음 시작 통합. ⚠️ BE 작업 중.
   * consultationId 기준이라 프론트가 sessionId 를 몰라도 된다.
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

export const endpoints = {
  auth,
  users,
  routes,
  consultations,
  openvidu,
  admin,
} as const
