import { useTranslation } from 'react-i18next'

import type { Place } from '@/shared/types/place'
import { PinIcon } from '@/user/features/destination-search/icons'
import {
  SEARCH_ERROR,
  type SearchErrorType,
} from '@/user/features/destination-search/lib/searchPlaces'

export interface PlaceResultListProps {
  results: Place[]
  isSearching: boolean
  errorType: SearchErrorType | null
  onSelect: (place: Place) => void
}

/** 검색 결과 후보 목록. 검색창 바로 아래에 카드로 떠 있는다. */
export function PlaceResultList({
  results,
  isSearching,
  errorType,
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
    <ul className="border-line bg-surface divide-line max-h-[44dvh] divide-y overflow-y-auto overscroll-contain rounded-2xl border shadow-[0_6px_20px_rgba(15,23,42,0.12)]">
      {results.map((place) => (
        <li key={place.placeId}>
          <button
            type="button"
            onClick={() => onSelect(place)}
            className="active:bg-surface-muted flex w-full items-start gap-3 px-4 py-3 text-left"
          >
            <PinIcon className="text-brand mt-0.5 size-[18px] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="text-ink block truncate text-[14.5px] font-semibold">
                {place.name}
              </span>
              {place.address ? (
                <span className="text-ink-muted block truncate text-[12.5px]">
                  {place.address}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
