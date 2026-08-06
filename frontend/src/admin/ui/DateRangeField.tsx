import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DayPicker,
  type ClassNames,
  type DateRange,
  type Formatters,
} from 'react-day-picker'

import { cn } from '@/shared/lib/cn'
import { CalendarIcon } from '@/shared/ui'
import { AdminButton } from '@/admin/ui/AdminButton'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

/*
  기본 로케일(en-US)이 "November 2022" / "Su Mo Tu" 로 그린다. 관리자 화면은
  한국어 고정이라 포맷터만 갈아끼운다 — date-fns 로케일을 통째로 import 하는
  것보다 번들이 가볍고, 요일 한 글자 표기도 우리가 원하는 대로 나온다.
*/
const FORMATTERS: Partial<Formatters> = {
  formatCaption: (month) =>
    `${month.getFullYear()}년 ${month.getMonth() + 1}월`,
  formatWeekdayName: (weekday) => WEEKDAYS[weekday.getDay()] ?? '',
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 트리거 버튼용 짧은 표기 — `26.08.01` */
function formatShort(date: Date): string {
  return `${pad(date.getFullYear() % 100)}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function formatTriggerLabel(range: DateRange | undefined): string {
  if (!range?.from) return '기간 선택'
  if (!range.to) return `${formatShort(range.from)} ~`
  return `${formatShort(range.from)} ~ ${formatShort(range.to)}`
}

/*
  DayPicker 기본 CSS(react-day-picker/style.css)는 가져오지 않는다. 전부
  classNames 로 덮어써야 관리자 팔레트(brand·ink·line)와 톤이 맞고, 기본 CSS 를
  같이 넣으면 Tailwind 유틸리티와 우선순위 싸움이 난다.

  ⚠️ 선택 상태 클래스(range_start·range_middle·range_end)는 버튼이 아니라 바깥
     td 에 붙는다. 그래서 알약(pill) 배경은 td 가 그리고, 안쪽 동그라미는
     `[&>button]:` 자식 선택자로 칠한다. hover 까지 같이 덮어야 하는 이유는
     cn 이 tailwind-merge 가 아니라 day_button 의 hover 배경이 그대로 남기
     때문 — `.range_start > button:hover` 가 특이도에서 이겨야 한다.
*/
const DAY_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full text-[13px] transition hover:bg-brand-soft focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none'

const EDGE_BUTTON =
  '[&>button]:bg-brand-dark [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-brand-dark'

const NAV_BUTTON =
  'text-ink-muted hover:bg-surface-muted inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30'

function buildClassNames(hasFullRange: boolean): Partial<ClassNames> {
  // from 만 고른 중간 상태에서 배경 알약을 그리면 오른쪽이 잘린 막대처럼 보인다.
  // 범위가 닫힌 뒤에만 연결 막대를 그린다.
  const edgeTrack = hasFullRange ? 'bg-brand-soft/70' : ''

  return {
    root: 'w-[268px]',
    months: 'flex flex-col',
    month: 'flex flex-col gap-2',
    nav: 'flex items-center gap-1',
    button_previous: NAV_BUTTON,
    button_next: NAV_BUTTON,
    chevron: 'h-4 w-4 fill-current',
    month_caption: 'flex h-8 items-center justify-center',
    caption_label: 'text-ink text-[14px] font-bold',
    month_grid: 'w-full border-collapse',
    weekdays: '',
    weekday: 'text-ink-faint h-8 w-9 text-[12px] font-medium',
    week: '',
    day: 'h-9 w-9 p-0 text-center align-middle',
    day_button: DAY_BUTTON,
    today: '[&>button]:text-brand [&>button]:font-bold',
    outside: 'text-ink-faint opacity-45',
    disabled: 'text-ink-faint opacity-35',
    selected: '',
    range_start: cn('rounded-l-full', edgeTrack, EDGE_BUTTON),
    range_end: cn('rounded-r-full', edgeTrack, EDGE_BUTTON),
    range_middle:
      'bg-brand-soft/70 [&>button]:bg-transparent [&>button]:text-brand-dark [&>button]:hover:bg-brand/25',
  }
}

export interface DateRangeFieldProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
}

/**
 * 기간 선택 필드 — 캘린더 아이콘을 누르면 달력이 열리고 시작·종료일을 고른다.
 *
 * 값을 바로 서버로 보내지 않고 바깥(HistorySearchBar)의 [검색] 버튼이 확정한다.
 * 그래서 이 컴포넌트는 선택 상태만 위로 올리고 조회에는 관여하지 않는다.
 */
export function DateRangeField({
  value,
  onChange,
  className,
}: DateRangeFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 상담 기록은 과거에만 존재한다. 미래 날짜는 고를 수 없게 막는다.
  // 렌더마다 새 Date 를 만들면 DayPicker 가 매번 다른 prop 으로 본다.
  const today = useMemo(() => new Date(), [])

  const hasFullRange = Boolean(value?.from && value.to)
  const classNames = useMemo(
    () => buildClassNames(hasFullRange),
    [hasFullRange],
  )

  /*
    바깥 클릭·Escape 로 닫는다. 패널 헤더 안에 떠 있는 팝오버라 모달처럼
    배경을 덮지 않으므로, 닫기 경로를 직접 달아 줘야 한다.
    pointerdown 을 쓰는 이유: click 은 목록의 버튼을 눌렀을 때 그 버튼이
    먼저 처리돼 팝오버가 열린 채로 남는 순간이 생긴다.
  */
  useEffect(() => {
    if (!isOpen) return

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const hasValue = Boolean(value?.from)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition',
          'focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none',
          hasValue
            ? 'border-brand bg-brand-soft/60 text-brand-dark'
            : 'border-line bg-surface text-ink-muted hover:bg-surface-muted',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {formatTriggerLabel(value)}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="조회 기간 선택"
          className="border-line bg-surface absolute top-[calc(100%+8px)] right-0 z-30 rounded-2xl border p-4 shadow-xl"
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            defaultMonth={value?.from}
            endMonth={today}
            disabled={{ after: today }}
            showOutsideDays
            navLayout="around"
            formatters={FORMATTERS}
            classNames={classNames}
          />

          <div className="border-line mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <p className="text-ink-muted text-[12.5px]">
              {value?.from
                ? value.to
                  ? '기간이 선택됐습니다.'
                  : '종료일을 선택하세요.'
                : '시작일을 선택하세요.'}
            </p>

            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={!hasValue}
                onClick={() => onChange(undefined)}
              >
                지우기
              </AdminButton>
              <AdminButton
                size="sm"
                className="rounded-full"
                onClick={() => setIsOpen(false)}
              >
                확인
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
