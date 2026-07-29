import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { Button, UserIcon } from '@/shared/ui'

export interface AccountMenuProps {
  isLoggedIn: boolean
  /** 아바타 이니셜 표기에 사용 */
  email?: string
  onSignIn: () => void
  onSignOut: () => void
  onDeleteAccount: () => void
}

interface AccountMenuItemProps {
  children: string
  onSelect: () => void
  danger?: boolean
}

function AccountMenuItem({
  children,
  onSelect,
  danger = false,
}: AccountMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        'hover:bg-surface-muted block w-full px-4 py-3 text-left text-[13.5px] font-bold',
        'border-line border-b last:border-b-0',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {children}
    </button>
  )
}

/** 우상단 계정 영역: 비로그인은 로그인 버튼, 로그인 상태는 아바타 + 드롭다운 */
export function AccountMenu({
  isLoggedIn,
  email,
  onSignIn,
  onSignOut,
  onDeleteAccount,
}: AccountMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoggedIn) setIsOpen(false)
  }, [isLoggedIn])

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  if (!isLoggedIn) {
    return (
      <Button variant="secondary" size="sm" onClick={onSignIn}>
        {t('auth.signIn')}
      </Button>
    )
  }

  const initial = email?.trim().charAt(0).toUpperCase()

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('auth.accountMenu')}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'bg-brand-gradient flex size-[34px] items-center justify-center rounded-full text-white',
          'focus-visible:ring-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        {initial ? (
          <span className="text-sm font-extrabold">{initial}</span>
        ) : (
          <UserIcon className="size-[18px]" aria-hidden />
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="border-line bg-surface absolute top-[42px] right-0 z-20 w-40 overflow-hidden rounded-2xl border shadow-lg"
        >
          <AccountMenuItem
            onSelect={() => {
              setIsOpen(false)
              onSignOut()
            }}
          >
            {t('auth.signOut')}
          </AccountMenuItem>
          <AccountMenuItem
            danger
            onSelect={() => {
              setIsOpen(false)
              onDeleteAccount()
            }}
          >
            {t('auth.deleteAccount')}
          </AccountMenuItem>
        </div>
      ) : null}
    </div>
  )
}
