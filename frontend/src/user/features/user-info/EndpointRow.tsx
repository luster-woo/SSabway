import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import type { GuideEndpoint } from '@/shared/types/guide'

export interface EndpointRowProps {
  /** '출발' / '도착' 라벨 */
  kind: string
  endpoint: GuideEndpoint
  icon: ReactNode
  /** 없으면 변경 버튼을 그리지 않는다. */
  onChange?: () => void
  changeLabel?: string
  className?: string
}

/**
 * 출발지·도착지 한 줄. 아이콘 · (라벨/설명 + 이름) · 변경 버튼 순으로 배치한다.
 *
 * 역명이 길어져도 변경 버튼이 밀려나지 않도록 가운데 영역만 줄어들게 한다.
 */
export function EndpointRow({
  kind,
  endpoint,
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

      <div className="min-w-0 flex-1">
        <p className="text-ink-muted text-[11.5px] font-bold">
          {kind} · {endpoint.detail}
        </p>
        <p className="text-ink mt-0.5 truncate text-[clamp(15px,4.4vw,17px)] font-bold">
          {endpoint.name}
        </p>
      </div>

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
