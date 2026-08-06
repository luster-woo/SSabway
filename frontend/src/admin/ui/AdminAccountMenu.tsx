import { useEffect, useRef, useState } from 'react'

import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon, LogoutIcon, UserIcon } from '@/shared/ui'

export interface AdminAccountMenuProps {
  /**
   * 로그인한 역무원 사번. 새로고침 직후 등 아직 복구되지 않았으면 null 이 온다
   * (useAdminProfileStore 참고). 그 경우에도 메뉴 자체는 열려야 로그아웃할 수 있다.
   */
  staffCode: string | null
  onSignOut: () => void
}

/**
 * 관리자 헤더 우측의 계정 메뉴.
 *
 * 헤더에 [블랙리스트 명단] [로그아웃] [사번] 이 나란히 놓여 있어 셋 다 눈에 띄지
 * 않는다는 지적이 있었다. 계정 성격의 항목(사번·로그아웃)을 이 드롭다운으로 묶어
 * 헤더에 남는 요소를 둘로 줄이고, 업무 기능인 [블랙리스트 명단] 은 헤더에 그대로
 * 두되 색으로 띄운다. 로그아웃을 한 단계 숨기는 것은 의도된 것이다 — 공용 PC 라
 * 오조작으로 눌리면 곤란한 쪽에 가깝다.
 *
 * 데스크톱 전용 화면이라 모바일 터치 동작은 고려하지 않는다.
 */
export function AdminAccountMenu({
  staffCode,
  onSignOut,
}: AdminAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /*
    바깥 클릭과 Esc 로 닫는다.

    click 이 아니라 mousedown 을 듣는다. 드롭다운 밖의 버튼을 눌렀을 때 그 버튼의
    click 이 먼저 처리되고 나서 닫히는 편이 자연스럽고, click 으로 달면 메뉴를 여는
    클릭 자체가 같은 틱에 올라와 열리자마자 닫히는 일이 생긴다.
  */
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      // 포커스를 잃은 채로 닫히면 키보드 사용자가 갈 곳이 없다.
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={staffCode ? `계정 메뉴 (${staffCode})` : '계정 메뉴'}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full border py-1 pr-2.5 pl-1 transition',
          'focus-visible:ring-offset-brand-dark focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none',
          isOpen
            ? 'border-white/70 bg-white/15'
            : 'border-white/30 hover:bg-white/10',
        )}
      >
        <span className="bg-brand flex size-8 shrink-0 items-center justify-center rounded-full text-white">
          <UserIcon className="size-[18px]" />
        </span>
        <span className="text-[13px] font-bold text-white">
          {staffCode ?? '역무원'}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            'size-4 text-white/70 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="계정 메뉴"
          /*
            z-30: 헤더 아래 본문 패널 위로 확실히 올린다. 모달(Modal.tsx)보다는
            낮아야 명단을 연 상태에서 메뉴가 모달 위로 튀지 않는다.
          */
          className="border-line bg-surface absolute top-[calc(100%+8px)] right-0 z-30 w-52 overflow-hidden rounded-2xl border py-1.5 shadow-lg"
        >
          <p className="text-ink-faint px-4 pt-1.5 pb-0.5 text-[11.5px]">
            로그인 계정
          </p>
          <p className="text-ink border-line mb-1.5 truncate border-b px-4 pb-2.5 text-[13px] font-bold">
            {staffCode ?? '확인할 수 없음'}
          </p>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onSignOut()
            }}
            className="text-danger hover:bg-surface-muted focus-visible:bg-surface-muted flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-bold transition focus-visible:outline-none"
          >
            <LogoutIcon aria-hidden className="size-4 shrink-0" />
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  )
}
