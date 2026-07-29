export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** 사용자가 언어를 고르지 않은 상태의 기본값. 브라우저 언어보다 우선한다. */
export const DEFAULT_LANGUAGE: Language = 'ko'

export interface User {
  userId: number
  email: string
  language: Language
  createdAt: string
  deletedAt: string | null
}

export interface Staff {
  staffId: number
  stationId: number
  username: string
  staffCode: string
}
