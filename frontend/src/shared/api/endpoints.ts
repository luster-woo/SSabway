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

/** 화상 상담 (사용자) */
const consultations = {
  create: '/consultations',
  detail: (id: number) => `/consultations/${id}`,
  cancel: (id: number) => `/consultations/${id}`,
  leave: (id: number) => `/consultations/${id}/leave`,
  token: (id: number) => `/consultations/${id}/token`,
} as const

/** 관리자 */
const admin = {
  login: '/admins/login',
  waiting: (page: number) => `/admins/waiting?page=${page}`,
  history: (page: number) => `/admins/history?page=${page}`,
  consultationDetail: (id: number) => `/admins/consultations?id=${id}`,
  accept: (id: number) => `/admin/consultations/${id}/accept`,
  end: (id: number) => `/admin/consultations/${id}/end`,
  blacklist: {
    list: (page: number) => `/admins/blacklist?page=${page}`,
    create: '/admins/blacklist',
    release: '/admins/blacklist',
    updateReason: '/admins/blacklist',
  },
} as const

export const endpoints = { auth, users, routes, consultations, admin } as const
