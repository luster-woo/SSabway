import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { SUPPORTED_LANGUAGES } from '@/shared/types/user'
import enCommon from '@/locales/en/common.json'
import jaCommon from '@/locales/ja/common.json'
import zhCommon from '@/locales/zh/common.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      ja: { common: jaCommon },
      zh: { common: zhCommon },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    // en-US, zh-TW 처럼 지역 코드가 붙어도 en, zh 로 매칭시킨다.
    // 이게 없으면 대부분의 브라우저에서 영어로 폴백된다.
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    detection: {
      // 사용자가 명시적으로 고른 언어가 브라우저 설정을 이긴다
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
