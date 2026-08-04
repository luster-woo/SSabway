import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'
import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import {
  ORIGIN_SOURCE,
  useOriginStationStore,
} from '@/shared/lib/store/useOriginStationStore'
import type { Place } from '@/shared/types/place'
import { MobileViewport, useToast } from '@/shared/ui'
import { TripEndpointBar } from '@/shared/ui/TripEndpointBar'
import { DestinationSearchBar } from '@/user/features/destination-search/DestinationSearchBar'
import { MapLoadErrorNotice } from '@/user/features/destination-search/MapLoadErrorNotice'
import { PlaceResultList } from '@/user/features/destination-search/PlaceResultList'
import { SelectedPlaceCard } from '@/user/features/destination-search/SelectedPlaceCard'
import { useGoogleDestinationMap } from '@/user/features/destination-search/hooks/useGoogleDestinationMap'
import {
  SDK_STATUS,
  useGoogleMapsSdk,
} from '@/user/features/destination-search/hooks/useGoogleMapsSdk'
import { useMyLocation } from '@/user/features/destination-search/hooks/useMyLocation'
import { usePlaceSearch } from '@/user/features/destination-search/hooks/usePlaceSearch'

/**
 * 3. 목적지 설정 — 지도에서 출발지와 도착지를 확정하는 화면.
 *
 * 장소를 검색해 고르면 하단 카드에 [출발지로 설정]·[도착지로 설정]이 뜬다.
 * 한 장소를 골라 어느 쪽으로 쓸지 사용자가 정하는 구조라, "구미역"처럼 출발도
 * 도착도 될 수 있는 지점을 한 화면에서 양쪽 다 지정할 수 있다.
 *
 * 지도 초기 위치는 GPS 동의 여부로 갈린다.
 *   동의  → 실제 좌표(또는 시작 화면에서 찾은 인근역)로 맞춘다
 *   비동의 → 서울역에서 시작한다 (useGoogleDestinationMap 의 DEFAULT_CENTER)
 * 어느 쪽이든 경로 조회의 출발지는 사용자가 직접 지정해야 정해진다.
 */
export default function DestinationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { status, errorType: sdkErrorType, retry } = useGoogleMapsSdk()

  const [keyword, setKeyword] = useState('')
  /** 실제로 검색을 실행한 키워드. 입력값과 분리해야 타이핑마다 호출되지 않는다. */
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)

  const destination = useDestinationStore((state) => state.destination)
  const setDestination = useDestinationStore((state) => state.setDestination)
  const originStation = useOriginStationStore((state) => state.originStation)
  const setOriginStation = useOriginStationStore(
    (state) => state.setOriginStation,
  )

  const { results, isSearching, hasSearched, errorType } =
    usePlaceSearch(submittedQuery)

  // GPS 동의가 돼 있으면 실제 좌표를 받아온다. (동의 전/거부면 null)
  const rawLocation = useMyLocation(status === SDK_STATUS.READY)

  /*
    파란 원("내 위치")의 위치.

    시작 화면이 GPS 로 찾아 둔 인근역이 있으면 그 좌표를, 없으면 방금 받은 GPS
    좌표를 쓴다. 단 사용자가 지도에서 출발지를 직접 골랐다면(MANUAL) 그 값은
    "내 위치"가 아니므로 여기서는 쓰지 않는다 — 그건 출발지 마커가 따로 그린다.

    새 객체 리터럴이 매 렌더 지도를 다시 맞추지 않도록 메모한다.
  */
  const originSource = useOriginStationStore((state) => state.originSource)
  const myLocation = useMemo(
    () =>
      originStation && originSource === ORIGIN_SOURCE.GPS
        ? {
            latitude: originStation.latitude,
            longitude: originStation.longitude,
          }
        : rawLocation,
    [originStation, originSource, rawLocation],
  )

  const { recenterToMyLocation } = useGoogleDestinationMap(mapContainerRef, {
    isReady: status === SDK_STATUS.READY,
    selected,
    origin: originStation,
    destination,
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

  /*
    같은 지점인지 좌표로 판정한다. placeId 는 검색 소스가 달라지면 바뀌지만
    (GPS 로 찾은 인근역에는 아예 없다) 좌표는 어느 경로로 들어와도 같다.
  */
  const isSamePoint = (
    a: { latitude: number; longitude: number } | null,
    b: { latitude: number; longitude: number } | null,
  ) => !!a && !!b && a.latitude === b.latitude && a.longitude === b.longitude

  const applyOrigin = () => {
    if (!selected) return
    setOriginStation(
      {
        name: selected.name,
        latitude: selected.latitude,
        longitude: selected.longitude,
      },
      ORIGIN_SOURCE.MANUAL,
    )
    showToast(t('destination.originApplied', { name: selected.name }))
  }

  const applyDestination = () => {
    if (!selected) return
    setDestination(selected)
    showToast(t('destination.destinationApplied', { name: selected.name }))
  }

  const canProceed = !!originStation && !!destination

  const confirmTrip = () => {
    if (!canProceed) return
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

      {/* 검색창 + 구간 표시 + 결과 목록 (지도 위 레이어) */}
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

        {/* 지금까지 무엇이 정해졌는지 항상 보이게 둔다.
            지도 타일 위라 평문이면 묻혀서, 여기서만 흰 배경을 깔아 준다. */}
        <div className="pointer-events-auto">
          <TripEndpointBar
            className="border-line bg-surface/95 rounded-2xl border px-3.5 py-2 shadow-sm backdrop-blur"
            originName={originStation?.name ?? null}
            destinationName={destination?.name ?? null}
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

      {/* 현재 위치로 이동 버튼. 내 좌표가 있을 때만 보인다. (아이콘만, 텍스트 없음) */}
      {myLocation ? (
        <button
          type="button"
          aria-label={t('destination.recenter')}
          onClick={recenterToMyLocation}
          className={cn(
            'bg-surface text-brand-dark border-line absolute right-4 z-20 flex size-11 items-center justify-center rounded-full border shadow-lg transition active:scale-95',
            // 장소를 고르면 하단 카드가 뜨므로 그 위로 버튼을 올린다. (카드 높이 근사값)
            selected
              ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+15rem)]'
              : 'bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]',
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-5"
          >
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
            <line x1="12" y1="1.5" x2="12" y2="4.5" />
            <line x1="12" y1="19.5" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4.5" y2="12" />
            <line x1="19.5" y1="12" x2="22.5" y2="12" />
          </svg>
        </button>
      ) : null}

      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <SelectedPlaceCard
            place={selected}
            isOrigin={isSamePoint(selected, originStation)}
            isDestination={isSamePoint(selected, destination)}
            canProceed={canProceed}
            onSetOrigin={applyOrigin}
            onSetDestination={applyDestination}
            onConfirm={confirmTrip}
            onReset={resetSearch}
          />
        </div>
      ) : null}
    </MobileViewport>
  )
}
