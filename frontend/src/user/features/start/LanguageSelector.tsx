import { LANGUAGE_OPTIONS } from '@/shared/lib/languages'
import type { Language } from '@/shared/types/user'
import { SelectableTile } from '@/shared/ui'

export interface LanguageSelectorProps {
  value: Language
  onChange: (next: Language) => void
  /** 접근성용: 섹션 라벨 요소의 id */
  labelledBy?: string
}

/** 2×2 언어 선택 그리드. 언어 이름은 번역하지 않고 원어 표기를 유지한다. */
export function LanguageSelector({
  value,
  onChange,
  labelledBy,
}: LanguageSelectorProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2"
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <SelectableTile
          key={option.code}
          lang={option.code}
          selected={option.code === value}
          label={option.label}
          centered
          onClick={() => onChange(option.code)}
        />
      ))}
    </div>
  )
}
