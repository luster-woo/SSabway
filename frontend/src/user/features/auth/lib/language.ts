import { SUPPORTED_LANGUAGES, type Language } from '@/shared/types/user'

/** 명세가 요구하는 언어 코드. 요청 본문에는 대문자로 보낸다. */
export type LangCode = Uppercase<Language>

const LANG_CODE: Record<Language, LangCode> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
}

/**
 * 앱 언어를 명세의 언어 코드로 바꾼다.
 *
 * toUpperCase() 결과를 단정(as)하지 않고 표로 두는 이유는, 지원 언어가
 * 늘었을 때 표를 채우지 않으면 컴파일이 깨지도록 만들기 위함이다.
 */
export function toLangCode(language: Language): LangCode {
  return LANG_CODE[language]
}

/**
 * 서버가 준 언어 코드를 앱의 Language 로 바꾼다. 모르는 값이면 null.
 *
 * 명세 예시는 "EN" 처럼 대문자지만 서버에서 오는 값이라 타입으로 단정할 수 없다.
 * string 으로 받아 여기서 검사한다. 지원하지 않는 언어가 와도 로그인 자체는
 * 성공시켜야 하므로 던지지 않고 null 을 준다.
 *
 * 일반 로그인과 구글 로그인이 같은 응답 형식을 쓰므로 두 훅이 공유한다.
 */
export function toLanguage(code: string): Language | null {
  const lower = code.toLowerCase()
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lower)
    ? (lower as Language)
    : null
}
