import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { AppLogo } from '@/shared/ui'

export interface AdminShellProps {
  /** 헤더 아래 본문 */
  children: ReactNode
  /** 헤더 우측 영역(계정 정보, 로그아웃 등) */
  headerRight?: ReactNode
  className?: string
}

/**
 * 관리자 화면의 공통 골격.
 *
 * - 데스크톱 전용이라 md:/lg: 접두사 없이 데스크톱 레이아웃을 그대로 작성하고,
 *   좁은 창에서 무너지지 않도록 min-w-[1024px] + overflow-x-auto 로 감싼다.
 * - 사용자 화면과 달리 다국어를 쓰지 않고 한국어로 고정한다.
 */
export function AdminShell({
  children,
  headerRight,
  className,
}: AdminShellProps) {
  return (
    <div className="overflow-x-auto">
      <div
        className={cn(
          'bg-surface-muted text-ink flex min-h-[100dvh] min-w-[1024px] flex-col',
          className,
        )}
      >
        <header className="bg-brand-dark flex h-16 shrink-0 items-center gap-3 px-6">
          <AppLogo size="30px" />
          <span className="text-[15px] font-bold text-white">
            SSabway Admin
          </span>
          {headerRight ? <div className="ml-auto">{headerRight}</div> : null}
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
