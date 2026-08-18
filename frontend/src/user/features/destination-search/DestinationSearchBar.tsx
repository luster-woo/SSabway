import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ChevronLeftIcon,
  SearchIcon,
} from '@/user/features/destination-search/icons'

export interface DestinationSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
  /** 입력값이 있을 때만 노출되는 지우기 버튼 */
  onClear: () => void
}

/** 지도 위에 떠 있는 검색창. 3페이지 진입 시 지도와 함께 유일하게 보이는 UI다. */
export function DestinationSearchBar({
  value,
  onChange,
  onSubmit,
  onBack,
  onClear,
}: DestinationSearchBarProps) {
  const { t } = useTranslation()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="border-line bg-surface flex h-12 items-center gap-1 rounded-full border pr-1.5 pl-1 shadow-[0_4px_16px_rgba(15,23,42,0.14)]"
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={t('destination.back')}
        className="text-ink-muted flex size-10 shrink-0 items-center justify-center rounded-full"
      >
        <ChevronLeftIcon className="size-5" />
      </button>

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('destination.placeholder')}
        aria-label={t('destination.placeholder')}
        enterKeyHint="search"
        autoComplete="off"
        className="text-ink placeholder:text-ink-muted/70 min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
      />

      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('destination.clear')}
          className="bg-surface-muted text-ink-muted flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] leading-none"
        >
          ×
        </button>
      ) : null}

      <button
        type="submit"
        aria-label={t('destination.search')}
        className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-white"
      >
        <SearchIcon className="size-[18px]" />
      </button>
    </form>
  )
}
