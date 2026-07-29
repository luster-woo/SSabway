import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white font-bold shadow-sm',
  secondary: 'bg-white text-ink border border-line',
  ghost: 'bg-transparent text-ink-muted',
}

// 높이·글자 크기는 기기 폭에 맞춰 늘어나되 터치 최소 크기(44px)를 지킨다.
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-xl',
  md: 'h-11 px-4 text-sm rounded-2xl',
  lg: 'h-[clamp(48px,14vw,56px)] px-5 text-[clamp(15px,4.4vw,17px)] rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 transition',
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
