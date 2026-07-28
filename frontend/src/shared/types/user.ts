export const SUPPORTED_LANGUAGES = ['en', 'ja', 'zh'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

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
