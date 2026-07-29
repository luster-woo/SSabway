import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useLanguage } from '@/shared/lib/useLanguage'
import type { Place } from '@/shared/types/place'
import {
  PlaceSearchError,
  SEARCH_ERROR,
  searchPlaces,
  type SearchErrorType,
} from '@/user/features/destination-search/lib/searchPlaces'

/** 같은 키워드를 다시 눌렀을 때 외부 API를 또 때리지 않도록 5분 캐싱한다. */
const STALE_MS = 5 * 60 * 1000

export interface UsePlaceSearchResult {
  results: Place[]
  isSearching: boolean
  /** 검색을 한 번이라도 실행했는지. 진입 직후 "결과 없음"이 뜨는 걸 막는다. */
  hasSearched: boolean
  errorType: SearchErrorType | null
}

/**
 * 확정된 키워드로 목적지 후보를 조회한다.
 * 입력 중인 값이 아니라 **제출된 키워드**를 받는다 — 타이핑마다 호출하면
 * 외부 지도 API 쿼터를 그대로 소모한다.
 */
export function usePlaceSearch(submittedQuery: string): UsePlaceSearchResult {
  const { language } = useLanguage()
  const query = submittedQuery.trim()

  const { data, isFetching, error, isFetched } = useQuery({
    queryKey: queryKeys.place.search(query, language),
    queryFn: () => searchPlaces(query, { useEnglish: language !== 'ko' }),
    enabled: query.length > 0,
    staleTime: STALE_MS,
    retry: false,
    // 검색 결과 목록이 깜빡였다 다시 그려지지 않도록 이전 결과를 잠깐 유지한다.
    placeholderData: (previous) => previous,
  })

  return {
    results: data ?? [],
    isSearching: isFetching,
    hasSearched: query.length > 0 && isFetched,
    errorType:
      error instanceof PlaceSearchError
        ? error.reason
        : error
          ? SEARCH_ERROR.FAILED
          : null,
  }
}
