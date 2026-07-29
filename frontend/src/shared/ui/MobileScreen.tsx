import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { MobileViewport } from '@/shared/ui/MobileViewport'

export interface MobileScreenProps {
  /** 스크롤되는 본문 */
  children: ReactNode
  /** 화면 하단에 고정되는 영역(주요 CTA 등) */
  footer?: ReactNode
  /** 상단에 고정되는 영역(헤더, 계정 버튼 등) */
  header?: ReactNode
  className?: string
}

/** 좌우 여백: 320px 기기부터 430px 기기까지 부드럽게 늘어난다. */
const GUTTER = 'px-[clamp(16px,5vw,24px)]'

/**
 * 여백·헤더·푸터가 있는 일반 화면 골격. (폰 규격은 MobileViewport가 책임)
 *
 * - 높이는 100dvh 기준. 노치·홈바는 safe-area와 기본 여백을 calc로 합산해
 *   흡수한다 — 따로 쓰면 서로 덮어써 여백이 사라진다.
 * - 여백·글자 크기는 clamp로 처리한다.
 *   (사용자 페이지에는 md:/lg: 접두사를 쓰지 않는다)
 */
export function MobileScreen({
  children,
  header,
  footer,
  className,
}: MobileScreenProps) {
  return (
    <MobileViewport
      className={cn('bg-surface text-ink px-safe flex flex-col', className)}
    >
      {header ? (
        <header
          className={cn(
            GUTTER,
            'shrink-0 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]',
          )}
        >
          {header}
        </header>
      ) : null}

      <main className={cn(GUTTER, 'flex flex-1 flex-col')}>{children}</main>

      {footer ? (
        <footer
          className={cn(
            GUTTER,
            'bg-surface sticky bottom-0 shrink-0 pt-3',
            'pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]',
          )}
        >
          {footer}
        </footer>
      ) : null}
    </MobileViewport>
  )
}
