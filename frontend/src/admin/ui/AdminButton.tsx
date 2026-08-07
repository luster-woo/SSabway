import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export type AdminButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'dangerOutline'
  /**
   * 연한 빨강 — 건수 배지(Chip tone="danger")와 같은 톤.
   *
   * 목록 안에서 "지금 누를 수 없다"를 알리되, 꽉 찬 빨강처럼 시선을 독점하지는
   * 않아야 할 때 쓴다. 같은 화면의 배지와 색을 맞춰 두 표시가 한 뜻으로 읽힌다.
   */
  | 'dangerSoft'
  | 'info'
  /** 다크 헤더 위에 올리는 버튼 */
  | 'onDark'
  /**
   * 다크 헤더 위에서 눈에 띄어야 하는 버튼.
   *
   * onDark 는 투명 배경 + 흰 테두리라 헤더에 여러 개가 놓이면 전부 같은 무게로
   * 보여 아무것도 눈에 들어오지 않는다. 이쪽은 표지판 노랑(sign-exit)으로
   * 채워 남색 배경과 정면으로 대비시킨다. 헤더에 하나만 쓴다.
   */
  | 'onDarkAccent'

export type AdminButtonSize = 'sm' | 'md' | 'lg'

/**
 * 색은 반드시 variant 로 고른다.
 *
 * shared/ui/Button 은 variant 기본 클래스와 넘겨받은 className 을 그대로 이어붙이는데
 * cn 이 tailwind-merge 가 아니라 중복 클래스를 지우지 않는다. 그래서 className 으로
 * bg-danger 를 덮어써도 CSS 순서에 따라 기본값(bg-brand-gradient)이 이길 수 있다.
 * 관리자 화면은 빨강 계열 버튼이 많아 이 컴포넌트를 따로 둔다.
 */
const VARIANT: Record<AdminButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white shadow-sm',
  secondary: 'bg-surface text-ink border border-line',
  danger: 'bg-danger text-white shadow-sm',
  dangerOutline: 'bg-surface text-danger border border-danger',
  dangerSoft: 'bg-danger/10 text-danger',
  info: 'bg-brand-soft text-brand-dark border border-brand',
  onDark: 'bg-transparent text-white border border-white/40',
  onDarkAccent: 'bg-sign-exit text-ink border border-sign-exit shadow-sm',
}

const SIZE: Record<AdminButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-xl',
  md: 'h-11 px-4 text-sm rounded-2xl',
  lg: 'h-12 px-5 text-[15px] rounded-2xl',
}

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
  fullWidth?: boolean
}

/** 관리자 화면 전용 버튼. 데스크톱 기준이라 크기를 고정값으로 둔다. */
export function AdminButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...rest
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-bold transition',
        'focus-visible:ring-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    />
  )
}
