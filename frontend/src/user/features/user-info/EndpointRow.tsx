import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface EndpointRowProps {
  /** 한 줄로 보여줄 표기. "대구역 3층 6번 출구 앞" (describeStationPoint) */
  label: string
  icon: ReactNode
  /** 없으면 변경 버튼을 그리지 않는다. */
  onChange?: () => void
  changeLabel?: string
  className?: string
}

/**
 * 출발지·도착지 한 줄. 아이콘 · 표기 · 변경 버튼 순으로 배치한다.
 *
 * 표기가 길어져도 변경 버튼이 밀려나지 않도록 가운데 영역만 줄어들게 한다.
 * 글자는 아이콘(36px 원)과 세로 가운데를 맞춘다.
 */
export function EndpointRow({
  label,
  icon,
  onChange,
  changeLabel,
  className,
}: EndpointRowProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden
        className="bg-brand-soft text-brand-dark flex size-9 shrink-0 items-center justify-center rounded-full"
      >
        {icon}
      </span>

      <p className="text-ink min-w-0 flex-1 truncate text-[clamp(15px,4.4vw,17px)] font-bold">
        {label}
      </p>

      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="border-line text-ink-muted hover:border-brand/50 hover:text-brand-dark focus-visible:ring-brand h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-bold transition focus-visible:ring-2 focus-visible:outline-none"
        >
          {changeLabel}
        </button>
      ) : null}
    </div>
  )
}
