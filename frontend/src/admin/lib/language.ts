import type { Language } from '@/shared/types/user'

/**
 * 관리자 API 응답의 언어 코드.
 *
 * shared 의 Language('ko' | 'en' | 'ja' | 'zh')를 대문자로 좁힌 것이라
 * 지원 언어가 추가되면 이 타입도 따라간다.
 * 사용자 앱의 i18next 언어로 넘길 때는 toLowerCase() 가 필요하다.
 */
export type LangCode = Uppercase<Language>

/**
 * 역무원이 바로 알아볼 수 있게 한국어 이름으로 바꾼다.
 *
 * shared/lib/languages.ts 의 LANGUAGE_OPTIONS 는 각 언어 자체 표기(中文 등)라
 * 한국어 고정인 관리자 화면에는 맞지 않아 별도로 둔다.
 */
const LANGUAGE_NAME: Record<LangCode, string> = {
  KO: '한국어',
  EN: '영어',
  JA: '일본어',
  ZH: '중국어',
}

export function toLanguageName(langCode: LangCode): string {
  return LANGUAGE_NAME[langCode]
}
