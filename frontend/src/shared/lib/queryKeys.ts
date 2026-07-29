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
    /** 출발·도착 좌표로 조회한 추천 경로 목록 */
    path: (params: RoutePathParams) =>
      [
        ...queryKeys.route.all,
        'path',
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
