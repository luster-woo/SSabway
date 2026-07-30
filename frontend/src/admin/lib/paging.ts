/**
 * 목록 응답의 page 객체.
 *
 * API 명세서의 `GET /admins/waiting`, `GET /admins/history` 응답 형태를 그대로 따른다.
 * (Spring Data 의 Page 직렬화 형태 — page 가 숫자가 아니라 객체다)
 *
 * shared/types/api.ts 의 Page<T> 는 이 정보를 한 겹 펴놓은 형태라 응답과 맞지 않는다.
 * 어느 쪽을 표준으로 삼을지 정해지면 이 파일을 지우고 shared 쪽으로 합친다.
 */
export interface PageMeta {
  /** 현재 페이지 번호 (0부터) */
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

export const FIRST_PAGE = 0

/** 명세서 예시의 page.size 값 */
const DEFAULT_PAGE_SIZE = 20

/**
 * 목 응답에 넣을 page 객체를 만든다.
 * 목이 한 페이지만 돌려주므로 number 는 항상 첫 페이지다.
 * BE 연동 시 이 함수는 삭제한다.
 */
export function toMockPageMeta(totalElements: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(totalElements / DEFAULT_PAGE_SIZE))

  return {
    number: FIRST_PAGE,
    size: DEFAULT_PAGE_SIZE,
    totalElements,
    totalPages,
    first: true,
    last: totalPages === 1,
  }
}
