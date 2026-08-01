import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import type { Place } from '@/shared/types/place'
import { MobileViewport, useToast } from '@/shared/ui'
import { DestinationSearchBar } from '@/user/features/destination-search/DestinationSearchBar'
import { MapLoadErrorNotice } from '@/user/features/destination-search/MapLoadErrorNotice'
import { PlaceResultList } from '@/user/features/destination-search/PlaceResultList'
import { SelectedPlaceCard } from '@/user/features/destination-search/SelectedPlaceCard'
// 🔁 S15P11D104-322: 목적지 지도를 네이버 → 구글로 교체.
//    기존 네이버 훅 import 는 롤백용으로 주석 보관한다.
// import { useDestinationMap } from '@/user/features/destination-search/hooks/useDestinationMap'
// import {
//   SDK_STATUS,
//   useNaverMapsSdk,
// } from '@/user/features/destination-search/hooks/useNaverMapsSdk'
import { useGoogleDestinationMap } from '@/user/features/destination-search/hooks/useGoogleDestinationMap'
import {
  SDK_STATUS,
  useGoogleMapsSdk,
} from '@/user/features/destination-search/hooks/useGoogleMapsSdk'
import { useMyLocation } from '@/user/features/destination-search/hooks/useMyLocation'
import { usePlaceSearch } from '@/user/features/destination-search/hooks/usePlaceSearch'

/**
 * 3. 목적지 설정 — 지도에서 목적지를 확정하는 화면.
 *
 * 진입 직후에는 지도와 검색창만 보인다. GPS 동의가 돼 있으면 내 위치(파란 점)를
 * 지도에 표시하고 그 위치로 화면을 맞춘다. 키워드를 검색하면 후보 목록이 뜨고
 * 첫 번째 후보가 자동 선택되어 마커가 찍히며 그 위치로 확대 이동한다.
 * 다른 후보를 고르면 마커와 지도 중심이 그 후보로 옮겨간다.
 */
export default function DestinationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  // 🔁 const { status, errorType: sdkErrorType, retry } = useNaverMapsSdk()
  const { status, errorType: sdkErrorType, retry } = useGoogleMapsSdk()

  const [keyword, setKeyword] = useState('')
  /** 실제로 검색을 실행한 키워드. 입력값과 분리해야 타이핑마다 호출되지 않는다. */
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)

  const setDestination = useDestinationStore((state) => state.setDestination)
  const { results, isSearching, hasSearched, errorType } =
    usePlaceSearch(submittedQuery)

  // GPS 동의가 돼 있으면 내 위치를 받아온다. (동의 전/거부면 null → 마커 없음)
  const myLocation = useMyLocation(status === SDK_STATUS.READY)

  // 🔁 useDestinationMap(mapContainerRef, { ... })
  useGoogleDestinationMap(mapContainerRef, {
    isReady: status === SDK_STATUS.READY,
    selected,
    myLocation,
  })

  // 결과가 도착하면 첫 번째 후보를 기본 선택한다.
  // 이미 목록에 있는 후보를 골라둔 상태라면 그 선택을 유지한다.
  useEffect(() => {
    if (results.length === 0) return
    setSelected((prev) =>
      prev && results.some((place) => place.placeId === prev.placeId)
        ? prev
        : results[0],
    )
  }, [results])

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
    // 새 검색이므로 이전 선택은 지운다. 결과가 오면 위 이펙트가 첫 후보를 고른다.
    setSelected(null)
    setSubmittedQuery(trimmed)
  }

  const resetSearch = () => {
    setSelected(null)
    setKeyword('')
    setSubmittedQuery('')
  }

  const confirmDestination = () => {
    if (!selected) return
    setDestination(selected)
    void navigate('/route')
  }

  const isResultVisible = isSearching || hasSearched

  return (
    <MobileViewport className="bg-surface">
      {/* min-h-viewport: 부모 높이 계산이 틀어져도 지도가 0px로 접히지 않게 하는 보험 */}
      <div
        ref={mapContainerRef}
        className="google-map-canvas min-h-viewport absolute inset-0"
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
            onClear={resetSearch}
          />
        </div>

        {isResultVisible ? (
          <div className="pointer-events-auto">
            <PlaceResultList
              results={results}
              isSearching={isSearching}
              errorType={errorType}
              selectedPlaceId={selected?.placeId ?? null}
              onSelect={setSelected}
            />
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <SelectedPlaceCard
            place={selected}
            onConfirm={confirmDestination}
            onReset={resetSearch}
          />
        </div>
      ) : null}
    </MobileViewport>
  )
}
