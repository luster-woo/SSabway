import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { CheckIcon } from '@/shared/ui/icons'

export interface SelectableTileProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected: boolean
  label: ReactNode
  /** 선택됐을 때 오른쪽에 체크 표시를 노출한다. */
  showCheck?: boolean
}

/** 선택형 카드 버튼. 언어 선택·경로 선택 등 여러 화면에서 공통으로 쓴다. */
export function SelectableTile({
  selected,
  label,
  showCheck = true,
  className,
  ...rest
}: SelectableTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border transition',
        'h-[clamp(48px,13vw,54px)] px-[clamp(14px,4vw,20px)] text-[clamp(14px,4vw,15px)]',
        'focus-visible:ring-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        selected
          ? 'border-brand bg-brand-soft text-brand-dark border-[1.6px] font-bold'
          : 'border-line bg-surface text-ink hover:border-brand/40',
        className,
      )}
      {...rest}
    >
      <span>{label}</span>
      {showCheck && selected ? (
        <CheckIcon className="text-brand size-4" aria-hidden />
      ) : null}
    </button>
  )
}
