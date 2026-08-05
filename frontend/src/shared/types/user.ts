export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/**
 * 사용자가 언어를 고르지 않은 상태의 기본값. 브라우저 언어보다 우선한다.
 *
 * 외국인 대상 서비스라 영어를 기본으로 둔다. 한국어 사용자는 시작 페이지의
 * 언어 선택에서 바꾸면 localStorage(app_language)에 남아 다음 방문에도 유지된다.
 */
export const DEFAULT_LANGUAGE: Language = 'en'

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
