import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface MobileViewportProps {
  children: ReactNode
  /** 컬럼 밖 여백(레터박스) 색. 다크 화면은 dark를 쓴다. */
  tone?: 'light' | 'dark'
  /** 안쪽 컬럼에 적용할 클래스(배경색 등) */
  className?: string
}

/**
 * user(PWA) 모든 화면의 최소 골격 — 폰 규격 고정.
 *
 * 중앙 정렬 + max-w-[430px] + 100dvh만 책임진다.
 * 여백·헤더·푸터가 필요한 일반 화면은 MobileScreen을,
 * 풀블리드 화면(카메라·지도·화상)은 이 컴포넌트를 직접 쓴다.
 * 안쪽 컬럼이 relative라서 absolute 자식들이 폰 규격 안에 갇힌다.
 */
export function MobileViewport({
  children,
  tone = 'light',
  className,
}: MobileViewportProps) {
  return (
    <div
      className={cn(
        'flex min-h-[100dvh] justify-center',
        tone === 'dark' ? 'bg-black' : 'bg-surface',
      )}
    >
      <div
        className={cn(
          'relative min-h-[100dvh] w-full max-w-[430px] overflow-hidden',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
