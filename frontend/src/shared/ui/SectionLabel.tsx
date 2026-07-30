import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface SectionLabelProps {
  children: ReactNode
  className?: string
  id?: string
}

/** 섹션 제목용 소형 라벨 */
export function SectionLabel({ children, className, id }: SectionLabelProps) {
  return (
    <p
      id={id}
      className={cn('text-ink-muted text-[13px] font-bold', className)}
    >
      {children}
    </p>
  )
}
