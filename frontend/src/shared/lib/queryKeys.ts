import type { NavRouteRequest } from '@/shared/types/navigation'
import type { ConsultationStatus, RoutePathParams } from '@/shared/types'

export const queryKeys = {
  station: {
    all: ['station'] as const,
    list: () => [...queryKeys.station.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.station.all, id] as const,
    points: (id: number) => [...queryKeys.station.all, id, 'points'] as const,
  },
  place: {
    all: ['place'] as const,
    /** 목적지 키워드 검색 결과 (언어별로 표기가 달라 언어도 키에 넣는다) */
    search: (query: string, language: string) =>
      [...queryKeys.place.all, 'search', language, query] as const,
  },
  route: {
    all: ['route'] as const,
    /**
     * 출발·도착 좌표로 조회한 추천 경로 목록.
     * 역명이 요청 언어로 번역되어 오므로 언어도 키에 넣는다.
     */
    path: (params: RoutePathParams) =>
      [
        ...queryKeys.route.all,
        'path',
        params.language,
        params.startX,
        params.startY,
        params.endX,
        params.endY,
      ] as const,
  },
  guide: {
    all: ['guide'] as const,
    /** 안내 정보 확인 화면의 출발·도착 정보 */
    info: () => [...queryKeys.guide.all, 'info'] as const,
    /**
     * 경로 상세 안내의 단계 목록(역 내 안내).
     *
     * 요청 본문을 키에 넣는다 — 답을 바꾸거나(엘리베이터 없이 다시 찾기)
     * 표지판을 다시 찍어 출발 지점이 바뀌면 다른 경로이므로 캐시가 갈려야 한다.
     * 본문이 null 이면(질문 미완료) 조회 자체를 하지 않는다.
     */
    navi: (request: NavRouteRequest | null) =>
      [...queryKeys.guide.all, 'navi', request] as const,
  },
  consultation: {
    all: ['consultation'] as const,
    detail: (id: number) => [...queryKeys.consultation.all, id] as const,
    /** 역무원 대기 목록 (3초 폴링) */
    waiting: (page: number) =>
      [...queryKeys.consultation.all, 'waiting', page] as const,
    /** 민원 기록 */
    history: (page: number) =>
      [...queryKeys.consultation.all, 'history', page] as const,
    byStatus: (status: ConsultationStatus) =>
      [...queryKeys.consultation.all, 'status', status] as const,
  },
  blacklist: {
    all: ['blacklist'] as const,
    list: (page: number) => [...queryKeys.blacklist.all, 'list', page] as const,
  },
} as const
