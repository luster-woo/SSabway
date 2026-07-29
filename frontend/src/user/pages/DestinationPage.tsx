import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import type { Place } from '@/shared/types/place'
import { MobileViewport, useToast } from '@/shared/ui'
import { DestinationSearchBar } from '@/user/features/destination-search/DestinationSearchBar'
import { MapLoadErrorNotice } from '@/user/features/destination-search/MapLoadErrorNotice'
import { PlaceResultList } from '@/user/features/destination-search/PlaceResultList'
import { SelectedPlaceCard } from '@/user/features/destination-search/SelectedPlaceCard'
import { useDestinationMap } from '@/user/features/destination-search/hooks/useDestinationMap'
import {
  SDK_STATUS,
  useNaverMapsSdk,
} from '@/user/features/destination-search/hooks/useNaverMapsSdk'
import { usePlaceSearch } from '@/user/features/destination-search/hooks/usePlaceSearch'

/**
 * 3. 목적지 설정 — 지도에서 목적지를 확정하는 화면.
 *
 * 진입 직후에는 지도와 검색창만 보인다. 키워드를 검색해 후보를 고르면
 * 마커가 찍히고 그 위치로 확대 이동하며, 하단에 확인 카드가 올라온다.
 */
export default function DestinationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { status, errorType: sdkErrorType, retry } = useNaverMapsSdk()

  const [keyword, setKeyword] = useState('')
  /** 실제로 검색을 실행한 키워드. 입력값과 분리해야 타이핑마다 호출되지 않는다. */
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)

  const setDestination = useDestinationStore((state) => state.setDestination)
  const { results, isSearching, hasSearched, errorType } =
    usePlaceSearch(submittedQuery)

  useDestinationMap(mapContainerRef, {
    isReady: status === SDK_STATUS.READY,
    selected,
  })

  const submitSearch = () => {
    const trimmed = keyword.trim()
    if (!trimmed) {
      showToast(t('destination.needKeyword'))
      return
    }
    if (status !== SDK_STATUS.READY) {
      showToast(t('destination.mapNotReady'))
      return
    }
    // 후보를 다시 고르는 흐름이므로 이전 선택은 지운다.
    setSelected(null)
    setSubmittedQuery(trimmed)
  }

  const selectPlace = (place: Place) => {
    setSelected(place)
    setKeyword(place.name)
    // 목록을 닫아 지도와 마커가 보이게 한다.
    setSubmittedQuery('')
  }

  const resetSelection = () => {
    setSelected(null)
    setKeyword('')
    setSubmittedQuery('')
  }

  const confirmDestination = () => {
    if (!selected) return
    setDestination(selected)
    void navigate('/user-info')
  }

  // 결과 목록은 검색을 실행했고 아직 목적지를 고르지 않은 동안에만 띄운다.
  const isResultVisible = selected === null && (isSearching || hasSearched)

  return (
    <MobileViewport className="bg-surface">
      {/* min-h-viewport: 부모 높이 계산이 틀어져도 지도가 0px로 접히지 않게 하는 보험 */}
      <div
        ref={mapContainerRef}
        className="naver-map-canvas min-h-viewport absolute inset-0"
      />

      {status === SDK_STATUS.LOADING ? (
        <div
          role="status"
          className="bg-surface-muted absolute inset-0 flex items-center justify-center"
        >
          <span
            aria-hidden
            className="border-line border-t-brand size-9 animate-spin rounded-full border-4"
          />
          <span className="sr-only">{t('destination.mapLoading')}</span>
        </div>
      ) : null}

      {status === SDK_STATUS.ERROR && sdkErrorType ? (
        <MapLoadErrorNotice errorType={sdkErrorType} onRetry={retry} />
      ) : null}

      {/* 검색창 + 결과 목록 (지도 위 레이어) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <div className="pointer-events-auto">
          <DestinationSearchBar
            value={keyword}
            onChange={setKeyword}
            onSubmit={submitSearch}
            onBack={() => void navigate(-1)}
            onClear={resetSelection}
          />
        </div>

        {isResultVisible ? (
          <div className="pointer-events-auto">
            <PlaceResultList
              results={results}
              isSearching={isSearching}
              errorType={errorType}
              onSelect={selectPlace}
            />
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <SelectedPlaceCard
            place={selected}
            onConfirm={confirmDestination}
            onReset={resetSelection}
          />
        </div>
      ) : null}
    </MobileViewport>
  )
}
