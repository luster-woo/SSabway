import { useTranslation } from 'react-i18next'

import type { Place } from '@/shared/types/place'
import { CheckIcon } from '@/shared/ui'
import { PinIcon } from '@/user/features/destination-search/icons'
import {
  SEARCH_ERROR,
  type SearchErrorType,
} from '@/user/features/destination-search/lib/searchGooglePlaces'

export interface PlaceResultListProps {
  results: Place[]
  isSearching: boolean
  errorType: SearchErrorType | null
  /** 현재 선택된 후보. 행에 선택 표시를 하기 위해 받는다. */
  selectedPlaceId: string | null
  onSelect: (place: Place) => void
}

/**
 * 검색 결과 후보 목록. 검색창 바로 아래에 카드로 떠 있는다.
 * 후보를 골라도 목록은 닫히지 않는다 — 다른 후보로 바꿔 고르는 흐름이 기본이다.
 */
export function PlaceResultList({
  results,
  isSearching,
  errorType,
  selectedPlaceId,
  onSelect,
}: PlaceResultListProps) {
  const { t } = useTranslation()

  const message = isSearching
    ? t('destination.searching')
    : errorType === SEARCH_ERROR.NO_RESULT
      ? t('destination.noResult')
      : errorType === SEARCH_ERROR.FAILED
        ? t('destination.searchFailed')
        : null

  if (message) {
    return (
      <div
        role="status"
        className="border-line bg-surface text-ink-muted rounded-2xl border px-4 py-5 text-center text-[13px] leading-5 whitespace-pre-line shadow-[0_6px_20px_rgba(15,23,42,0.12)]"
      >
        {message}
      </div>
    )
  }

  if (results.length === 0) return null

  return (
    <ul className="border-line bg-surface divide-line max-h-[122px] divide-y overflow-y-auto overscroll-contain rounded-2xl border shadow-[0_6px_20px_rgba(15,23,42,0.12)]">
      {results.map((place) => {
        const isSelected = place.placeId === selectedPlaceId

        return (
          <li key={place.placeId}>
            <button
              type="button"
              onClick={() => onSelect(place)}
              aria-pressed={isSelected}
              className={`active:bg-surface-muted flex w-full items-start gap-3 px-4 py-3 text-left ${
                isSelected ? 'bg-brand-soft/45' : ''
              }`}
            >
              <PinIcon
                className={`mt-0.5 size-[18px] shrink-0 ${
                  isSelected ? 'text-brand-dark' : 'text-brand'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[14.5px] font-semibold ${
                    isSelected ? 'text-brand-dark' : 'text-ink'
                  }`}
                >
                  {place.name}
                </span>
                {place.address ? (
                  <span className="text-ink-muted block truncate text-[12.5px]">
                    {place.address}
                  </span>
                ) : null}
              </span>
              {isSelected ? (
                <CheckIcon className="text-brand-dark mt-1 size-4 shrink-0" />
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
