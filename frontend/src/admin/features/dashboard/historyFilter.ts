import type { DateRange } from 'react-day-picker'

/**
 * 민원 기록 검색 조건 (FR-STAFF-001).
 *
 * 세 값 모두 선택이고 서로 독립이다 — 셋 다 null 이면 예전과 같은 전체 조회다.
 * 화면이 들고 있는 "적용된 조건"이자 그대로 쿼리 파라미터가 되는 형태라,
 * 비어 있음을 `''` 가 아니라 `null` 하나로만 표현한다(빈 문자열을 서버로
 * 보내면 "빈 값과 정확히 일치"로 읽혀 0건이 된다).
 */
export interface HistoryFilter {
  /** 사용자 이메일. 백엔드가 정확 일치·대소문자 무관으로 찾는다. */
  email: string | null
  /** 조회 시작일 yyyy-MM-dd (그 날 00:00 부터) */
  from: string | null
  /** 조회 종료일 yyyy-MM-dd (그 날 전체 포함) */
  to: string | null
}

/** 조건 없음 = 전체 조회 */
export const EMPTY_HISTORY_FILTER: HistoryFilter = {
  email: null,
  from: null,
  to: null,
}

/** 검색 중인지(= 조건이 하나라도 걸려 있는지) */
export function isFiltered(filter: HistoryFilter): boolean {
  return filter.email !== null || filter.from !== null || filter.to !== null
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Date → `yyyy-MM-dd`.
 *
 * ⚠️ `toISOString().slice(0, 10)` 을 쓰면 안 된다. UTC 로 변환되므로 KST 에서
 *    고른 8/6 이 8/5 로 하루 밀린다(자정~09:00 구간이 아니라 **항상** 밀린다 —
 *    캘린더가 만드는 Date 는 로컬 자정이고 KST 자정은 전날 15:00 UTC 다).
 *    백엔드가 LocalDate 로 받으므로 고른 날짜가 글자 그대로 가야 한다.
 */
export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 캘린더 선택 범위 → 검색 조건의 from·to. 미선택은 null. */
export function toRangeParams(
  range: DateRange | undefined,
): Pick<HistoryFilter, 'from' | 'to'> {
  return {
    from: range?.from ? toDateParam(range.from) : null,
    to: range?.to ? toDateParam(range.to) : null,
  }
}
