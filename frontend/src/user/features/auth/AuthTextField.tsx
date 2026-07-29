import { useId, type InputHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export interface AuthTextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string
}

/**
 * 라벨 + 입력창 한 쌍.
 *
 * 폰 화면 기준이라 높이·글자 크기를 clamp 로 준다.
 * iOS 는 16px 미만 입력창에 포커스하면 화면을 확대하는데,
 * index.css 의 base 레이어가 input 을 16px 로 고정해 두었다.
 *
 * TODO: 회원가입·비밀번호 재설정 화면에도 필요하면 shared/ui 로 올린다.
 */
export function AuthTextField({
  label,
  className,
  ...rest
}: AuthTextFieldProps) {
  const inputId = useId()

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-ink text-[13px] font-bold">
        {label}
      </label>

      <input
        id={inputId}
        className={cn(
          'bg-surface-muted h-[clamp(48px,13vw,54px)] rounded-2xl px-4 transition outline-none',
          'placeholder:text-ink-muted placeholder:opacity-60',
          'focus-visible:ring-brand focus-visible:bg-surface focus-visible:ring-2',
          className,
        )}
        {...rest}
      />
    </div>
  )
}
