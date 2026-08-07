import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { FitScrollText } from '@/user/features/user-info/FitScrollText'

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
 *
 * 표기는 언어에 따라(특히 영어) 한 줄을 넘길 만큼 길어질 수 있다. 줄바꿈 없이
 * FitScrollText 가 먼저 글자를 줄여 맞추고, 그래도 넘치면 가로 마퀴로 흘려
 * `...` 로 잘리지 않게 한다.
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

      <FitScrollText
        text={label}
        className="min-w-0 flex-1"
        textClassName="text-ink text-[clamp(15px,4.4vw,17px)] font-bold"
      />

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
