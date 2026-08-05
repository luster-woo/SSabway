import type { Language } from '@/shared/types/user'

export interface LanguageOption {
  code: Language
  /** 언어 이름은 번역하지 않고 항상 해당 언어의 표기를 그대로 보여준다. */
  label: string
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
]
