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
  googleLogin: '/users/login/google', // 보류
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
  /** 대기 취소 (WAITING 에서만) */
  cancel: (id: number) => `/consultations/${id}`,
  leave: (id: number) => `/consultations/${id}/leave`,
  /** 접속 토큰 발급·재발급 */
  token: (id: number) => `/consultations/${id}/token`,
} as const

/**
 * 화상 연결 — signaling 서버(ssabway_webrtc)의 실제 구현.
 *
 * OpenVidu 원시 API를 그대로 감싼 형태라 "상담 수락" 한 동작이 세 번의 호출로 쪼개진다.
 * 호출 순서와 실패 롤백은 `@/shared/api/openvidu` 가 책임진다. 화면에서 직접 부르지 말 것.
 *
 * ⚠️ nginx 가 `/api/` 를 ssabway 로만 보내고 있어 배포 환경에서는 아직 404 다.
 *    `location /api/v1/openvidu/ { proxy_pass http://signaling:8080; }` 추가가 필요하다.
 */
const openvidu = {
  createSession: '/openvidu/sessions',
  createConnection: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/connections`,
  startRecording: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/recordings`,
  stopRecording: (recordingId: string) =>
    `/openvidu/recordings/${encodeURIComponent(recordingId)}`,
  closeSession: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}`,
  /** 세션 종료 + 녹음 정지 + 상담 ENDED 전이를 한 번에 */
  endConsultation: (sessionId: string) =>
    `/openvidu/sessions/${encodeURIComponent(sessionId)}/end`,
} as const

/** 관리자 */
const admin = {
  login: '/admins/login',
  /**
   * 상담 대기 목록.
   *
   * ⚠️ 노션에 경로가 두 벌이다. 7/21 등록분은 `/admins/waiting`,
   *    7/27 정리 제안은 `/admin/consultations?status=WAITING` 이다.
   *    BE 구현 시작 전에 어느 쪽으로 확정할지 합의 필요. 지금은 7/27 안을 기본으로
   *    두고, 서버가 7/21 형태로 나오면 이 함수만 바꾼다.
   */
  waiting: (page: number) =>
    `/admin/consultations?status=WAITING&page=${page}`,
  history: (page: number) => `/admins/history?page=${page}`,
  consultationDetail: (id: number) => `/admins/consultations?id=${id}`,
  /**
   * 상담 수락 — 세션 생성 + 토큰 발급 + 녹음 시작 통합. ⚠️ BE 작업 중.
   * consultationId 기준이라 프론트가 sessionId 를 몰라도 된다.
   */
  accept: (id: number) => `/admin/consultations/${id}/accept`,
  /** 상담 종료 — 녹음 정지 + 세션 종료 + ENDED. ⚠️ BE 작업 중 */
  end: (id: number) => `/admin/consultations/${id}/end`,
  blacklist: {
    list: (page: number) => `/admins/blacklist?page=${page}`,
    create: '/admins/blacklist',
    release: '/admins/blacklist',
    updateReason: '/admins/blacklist',
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
