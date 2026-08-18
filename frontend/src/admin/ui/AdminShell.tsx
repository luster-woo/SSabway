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
 * - 높이는 h-[100dvh] + overflow-hidden 으로 뷰포트에 고정한다. min-h 로 두면
 *   본문(예: 상담방 정보패널)이 길어질 때 페이지가 통째로 늘어나 세로 스크롤이
 *   생기고 [상담 종료] 같은 버튼이 접힌다. 고정해 두면 flex-1/min-h-0 가 본문을
 *   뷰포트 안에 가두고, 각 패널이 자기 안에서만 스크롤한다.
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
          'bg-surface-muted text-ink flex h-[100dvh] min-w-[1024px] flex-col overflow-hidden',
          className,
        )}
      >
        <header className="bg-brand-dark flex h-16 shrink-0 items-center gap-3 px-6">
          {/*
            남색 헤더 위라 도안을 반전한다. 선이 가는 도안이라 30px 에서는
            뭉개져서, 64px 헤더가 허용하는 선에서 조금 키웠다.
          */}
          <AppLogo size="36px" tone="inverse" />
          <span className="text-[15px] font-bold text-white">
            SSabway Admin
          </span>
          {headerRight ? <div className="ml-auto">{headerRight}</div> : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
