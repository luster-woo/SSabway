import type { Language } from '@/shared/types/user'

/**
 * 시연용 자막 언어 고정 플래그.
 *
 * 라이브 시연에서는 UI 를 한국어로 두고(심사위원이 읽어야 하므로) 화상상담에서는
 * 영어↔한국어 번역을 보여주려 한다. 그런데 자막의 sourceLang 은 사용자가 고른
 * 화면 언어(useLanguage)를 그대로 따라가므로, 한국어를 고르면 ko↔ko 가 되어
 * 번역이 일어나지 않는다.
 *
 * 그래서 "화면 언어"와 "상담 자막 언어"를 이 플래그로만 분리해 둔다.
 * 값이 있으면 사용자 발화 언어를 그 언어로 간주하고, 사용자에게 보여줄 자막도
 * 그 언어로 번역해 받는다. 역무원 쪽은 원래대로 한국어 고정이다.
 *
 * **시연이 끝나면 null 로 되돌릴 것.** null 이면 원래 동작(화면 언어를 따름)이다.
 *
 * 적용 지점은 두 곳뿐이다:
 * - user/pages/ConsultationPage.tsx  (사용자 화면의 자막 두 갈래)
 * - admin/pages/AdminConsultationPage.tsx (역무원 화면이 인식할 사용자 언어)
 */
export const DEMO_CAPTION_LANG: Language | null = 'en'

/**
 * 사용자 발화 언어 / 사용자가 볼 자막 언어.
 * 플래그가 꺼져 있으면 인자로 받은 화면 언어를 그대로 쓴다.
 */
export function resolveUserCaptionLang(uiLanguage: Language): Language {
  return DEMO_CAPTION_LANG ?? uiLanguage
}

/**
 * 역무원 화면이 인식할 사용자 언어(대문자 코드).
 * 플래그가 꺼져 있으면 서버가 준 상담 정보의 langCode 를 그대로 쓴다.
 *
 * 반환 타입을 admin/lib/language 의 LangCode 로 못 박지 않는 이유는 shared 가
 * admin 을 참조하지 않기 위해서다. 두 타입 모두 Uppercase<Language> 라 같다.
 */
export function resolveAdminUserLangCode(
  serverLangCode: Uppercase<Language> | null,
): Uppercase<Language> | null {
  if (DEMO_CAPTION_LANG === null) return serverLangCode
  return DEMO_CAPTION_LANG.toUpperCase() as Uppercase<Language>
}
