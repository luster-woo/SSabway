import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'border-line bg-surface rounded-[22px] border p-4',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
      {...rest}
    />
  )
}
