import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

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
 * user(PWA) 화면의 공통 골격.
 *
 * - 폰 화면 기준(390px 디자인)이라 컨테이너 폭을 max-w-[430px]로 제한하고
 *   가운데 정렬한다. 큰 화면에서도 같은 폰 레이아웃을 유지한다.
 * - 높이는 100dvh 기준. 주소창 노출/숨김, 노치, 홈바는 safe-area로 흡수한다.
 *   safe-area와 기본 여백은 calc로 합산해야 서로 덮어쓰지 않는다.
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
    <div className="bg-surface text-ink flex min-h-[100dvh] justify-center">
      <div
        className={cn(
          'px-safe flex min-h-[100dvh] w-full max-w-[430px] flex-col',
          className,
        )}
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
      </div>
    </div>
  )
}
