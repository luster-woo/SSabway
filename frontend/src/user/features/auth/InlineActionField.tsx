import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface InlineActionFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string
  /** 입력창 오른쪽 버튼의 문구 */
  actionLabel: ReactNode
  onAction: () => void
  actionDisabled?: boolean
}

/**
 * 라벨 + [입력창][버튼] 한 줄.
 *
 * 프로토타입 7-2 의 "이메일 + 인증 발송", "인증번호 + 확인" 두 곳에 쓴다.
 * 버튼을 form 안에 두더라도 submit 으로 잡히지 않게 type="button" 으로 고정한다.
 */
export function InlineActionField({
  label,
  actionLabel,
  onAction,
  actionDisabled = false,
  className,
  ...rest
}: InlineActionFieldProps) {
  const inputId = useId()

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-ink text-[13px] font-bold">
        {label}
      </label>

      <div className="flex items-stretch gap-2">
        <input
          id={inputId}
          className={cn(
            'bg-surface-muted h-[clamp(48px,13vw,54px)] min-w-0 flex-1 rounded-2xl px-4 transition outline-none',
            'placeholder:text-ink-muted placeholder:opacity-60',
            'focus-visible:ring-brand focus-visible:bg-surface focus-visible:ring-2',
            className,
          )}
          {...rest}
        />

        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className={cn(
            'bg-brand-soft text-brand-dark shrink-0 rounded-2xl px-4 font-bold',
            'h-[clamp(48px,13vw,54px)] text-[clamp(13px,3.6vw,14px)] transition',
            'active:brightness-95 disabled:opacity-45',
            'focus-visible:ring-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
