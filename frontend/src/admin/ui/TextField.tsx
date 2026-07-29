import { useId, type InputHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string
  /** 값이 있으면 입력창을 붉게 표시하고 라벨 아래에 문구를 노출한다. */
  errorMessage?: string
}

/** 라벨 + 입력창 한 쌍. useId 로 label 과 input 을 연결한다. */
export function TextField({
  label,
  errorMessage,
  className,
  ...rest
}: TextFieldProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-ink text-[13px] font-bold">
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        className={cn(
          'bg-surface-muted h-12 rounded-xl px-4 text-[15px] transition outline-none',
          'placeholder:text-ink-muted placeholder:opacity-60',
          'focus-visible:ring-brand focus-visible:bg-surface focus-visible:ring-2',
          errorMessage && 'ring-danger ring-2',
          className,
        )}
        {...rest}
      />

      {errorMessage ? (
        <p id={errorId} className="text-danger text-[12.5px]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
