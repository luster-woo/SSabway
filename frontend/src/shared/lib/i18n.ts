import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/shared/types/user'
import koCommon from '@/locales/ko/common.json'
import enCommon from '@/locales/en/common.json'
import jaCommon from '@/locales/ja/common.json'
import zhCommon from '@/locales/zh/common.json'

export const LANGUAGE_STORAGE_KEY = 'app_language'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { common: koCommon },
      en: { common: enCommon },
      ja: { common: jaCommon },
      zh: { common: zhCommon },
    },
    // lng를 명시하면 LanguageDetector가 동작하지 않아 저장된 선택이 무시된다.
    // 저장값이 없을 때 fallbackLng로 떨어지므로
    // "선택 전 기본값 = DEFAULT_LANGUAGE(영어)"가 보장된다.
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    // en-US, zh-TW 처럼 지역 코드가 붙어도 en, zh 로 매칭시킨다.
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    detection: {
      // localStorage만 본다. navigator를 넣으면 브라우저 언어가 기본값을 덮어써
      // "선택 전 기본값 = DEFAULT_LANGUAGE" 규칙이 깨진다.
      // (한국 내 접속이면 브라우저 언어가 ko라 영어 기본값이 무력화된다)
      order: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
