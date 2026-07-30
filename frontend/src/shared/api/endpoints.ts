/** 인증 (사용자·관리자 공통) */
const auth = {
  logout: '/auth/logout',
  refresh: '/auth/refresh',
} as const

/** 사용자 */
const users = {
  signup: '/users',
  changePassword: '/users',
  withdraw: '/users',
  login: '/users/login',
  googleLogin: '/users/login/google', // 보류
  emailRequest: '/users/email/requests',
  emailVerification: '/users/email/verification',
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
