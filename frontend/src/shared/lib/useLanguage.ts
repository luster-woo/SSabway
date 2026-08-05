import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/shared/types/user'

function normalize(value: string | undefined): Language {
  const base = (value ?? '').split('-')[0]
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as Language)
    : DEFAULT_LANGUAGE
}

/**
 * 현재 언어와 변경 함수를 돌려준다.
 * 사용자가 아무것도 고르지 않았다면 항상 DEFAULT_LANGUAGE('en')다.
 */
export function useLanguage() {
  const { i18n } = useTranslation()
  const language = normalize(i18n.resolvedLanguage ?? i18n.language)

  // 스크린리더·폰트 폴백·:lang() 셀렉터가 올바르게 동작하도록 동기화한다.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const changeLanguage = useCallback(
    (next: Language) => {
      if (next === language) return
      void i18n.changeLanguage(next)
    },
    [i18n, language],
  )

  return { language, changeLanguage }
}
