/**
 * 목록 응답의 page 객체.
 *
 * 백엔드 PageResponse.page 형태를 그대로 따른다. (Spring Data Page 를 펼친 형태)
 * shared/types/api.ts 의 Page<T> 와 필드가 겹치지만, 목록 응답은 이 형태로 통일한다.
 */
export interface PageMeta {
  /** 현재 페이지 번호 (백엔드·목 모두 1부터) */
  number: number
  /** 페이지당 요소 개수 */
  size: number
  /** 전체 요소 개수. 화면의 "N건" 표기는 이 값을 쓴다. */
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/** 목록 응답의 data 부분 */
export interface PagedContent<T> {
  content: T[]
  page: PageMeta
}

/**
 * 목 배열을 페이지 크기로 잘라 백엔드 PageResponse 와 같은 형태로 만든다.
 * 페이지 번호는 1부터이며, 범위를 벗어나면 마지막 페이지로 보정한다.
 * BE 연동이 끝난 목록은 이 함수 대신 서버 응답의 page 를 그대로 쓴다.
 */
export function paginate<T>(
  all: readonly T[],
  page: number,
  size: number,
): PagedContent<T> {
  const totalElements = all.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * size

  return {
    content: all.slice(start, start + size),
    page: {
      number: current,
      size,
      totalElements,
      totalPages,
      first: current === 1,
      last: current === totalPages,
    },
  }
}
