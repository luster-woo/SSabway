import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export type ChipTone = 'danger' | 'warning' | 'info'

const TONE: Record<ChipTone, string> = {
  // 대기 건수처럼 주의를 끌어야 하는 값
  danger: 'bg-danger/10 text-danger',
  // 대기 시간
  warning: 'bg-amber-50 text-amber-700',
  // 언어 코드
  info: 'bg-brand-soft text-brand-dark',
}

export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  className?: string
}

/** 목록 항목에 붙는 작은 상태 표시. */
export function Chip({ children, tone = 'info', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full px-3 py-1',
        'text-[12px] font-bold whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
