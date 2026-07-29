import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface PanelProps {
  title: string
  /** 제목 우측 영역(건수 배지, 보조 버튼 등) */
  titleRight?: ReactNode
  /** 세로 스크롤되는 본문 */
  children: ReactNode
  className?: string
}

/**
 * 관리자 메인의 열 단위 패널.
 * 제목은 고정하고 본문만 스크롤해서 목록이 길어져도 제목이 사라지지 않게 한다.
 */
export function Panel({ title, titleRight, children, className }: PanelProps) {
  return (
    <section
      className={cn(
        'border-line bg-surface flex min-h-0 flex-col rounded-3xl border',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-3 px-7 pt-6 pb-4">
        <h2 className="text-ink text-[19px] font-bold">{title}</h2>
        {titleRight ? <div className="ml-auto">{titleRight}</div> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">{children}</div>
    </section>
  )
}
