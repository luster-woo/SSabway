import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { SearchIcon } from '@/shared/ui'
import {
  EMPTY_HISTORY_FILTER,
  toRangeParams,
  type HistoryFilter,
} from '@/admin/features/dashboard/historyFilter'
import { AdminButton } from '@/admin/ui/AdminButton'
import { DateRangeField } from '@/admin/ui/DateRangeField'

export interface HistorySearchBarProps {
  /** [검색]·[초기화] 를 눌렀을 때만 호출된다. 조회는 부모가 한다. */
  onSearch: (filter: HistoryFilter) => void
  /** 현재 적용된 조건이 있는지. 조건이 없으면 [초기화] 를 감춘다. */
  isFiltered: boolean
  /** 조회 중이면 중복 요청을 막는다. */
  isFetching?: boolean
}

/**
 * 민원 기록 검색바 — 기간 + 사용자 이메일 (FR-STAFF-001).
 *
 * 입력값(초안)은 여기가 들고 있고, [검색] 을 눌러야 부모의 조회 조건이 바뀐다.
 * 타이핑할 때마다 조회하면 이메일을 다 치기 전의 부분 문자열로 계속 요청이
 * 나가는데, 백엔드가 정확 일치라 그 요청들은 전부 0건이라 의미가 없다.
 */
export function HistorySearchBar({
  onSearch,
  isFiltered,
  isFetching = false,
}: HistorySearchBarProps) {
  const [email, setEmail] = useState('')
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  const hasDraft = email.trim() !== '' || range?.from !== undefined

  const submit = () => {
    onSearch({
      // 공백만 친 경우까지 null 로 접는다 — 빈 값을 보내면 0건이 된다.
      email: email.trim() || null,
      ...toRangeParams(range),
    })
  }

  const reset = () => {
    setEmail('')
    setRange(undefined)
    onSearch(EMPTY_HISTORY_FILTER)
  }

  return (
    <form
      className="flex flex-wrap items-center justify-end gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <DateRangeField value={range} onChange={setRange} />

      <div className="relative">
        <SearchIcon className="text-ink-faint pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="사용자 이메일"
          aria-label="사용자 이메일로 검색"
          autoComplete="off"
          className="border-line bg-surface text-ink placeholder:text-ink-faint focus-visible:ring-brand h-9 w-[168px] rounded-full border pr-3 pl-9 text-[13px] transition outline-none focus-visible:ring-2"
        />
      </div>

      <AdminButton
        type="submit"
        size="sm"
        className="rounded-full px-4"
        disabled={isFetching}
      >
        검색
      </AdminButton>

      {isFiltered || hasDraft ? (
        <AdminButton
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={reset}
        >
          초기화
        </AdminButton>
      ) : null}
    </form>
  )
}
