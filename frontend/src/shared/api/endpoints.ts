export const endpoints = {
  auth: {
    login: '/auth/login',
    oauth: (provider: string) => `/auth/oauth/${provider}`,
  },
  station: {
    list: '/stations',
    detail: (id: string) => `/stations/${id}`,
    points: (id: string) => `/stations/${id}/points`,
  },
  recognition: {
    sign: '/recognition/sign',
  },
  route: {
    search: '/routes',
  },
  consultation: {
    create: '/consultations', // → { consultationId, token }
    list: '/consultations', // ?status=WAITING
    accept: (id: string) => `/consultations/${id}/accept`, // → { token }
  },
  blacklist: {
    list: '/blacklists',
    create: '/blacklists',
    release: (id: string) => `/blacklists/${id}/release`,
  },
} as const
