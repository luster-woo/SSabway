export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/**
 * 사용자가 언어를 고르지 않은 상태의 기본값. 브라우저 언어보다 우선한다.
 *
 * 외국인 대상 서비스라 영어를 기본으로 둔다. 한국어 사용자는 시작 페이지의
 * 언어 선택에서 바꾸면 localStorage(app_language)에 남아 다음 방문에도 유지된다.
 */
export const DEFAULT_LANGUAGE: Language = 'en'

/**
 * 가입 경로. BE `Provider` enum 과 값이 1:1 이다.
 *   LOCAL  이메일/비밀번호 가입 (password_hash 존재)
 *   GOOGLE 구글 소셜 가입 (password_hash = NULL)
 */
export const PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER]

/**
 * `GET /users/me` 응답의 data.
 *
 * 회원 탈퇴 흐름에서만 쓴다. 서버는 언어 코드를 대문자로 준다("EN") —
 * 앱 내부의 `Language`(소문자)와 표기가 다르다.
 *
 * `language` 는 지금 화면에서 쓰지 않는다. 응답에 실려 오므로 형태만 적어 둔다
 * (새로고침 시 서버 언어 설정을 복구하는 데 쓸 수 있으나 별도 논의 사항이다).
 */
export interface UserMe {
  email: string
  provider: Provider
  language: Uppercase<Language>
}

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
