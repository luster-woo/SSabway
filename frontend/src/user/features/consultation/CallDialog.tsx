import { useEffect, useId, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface CallDialogProps {
  title: string
  /** 줄바꿈(\n)이 있는 문구도 그대로 보이도록 whitespace-pre-line 을 쓴다. */
  description: string
  /** 아이콘 등 제목 위에 놓을 요소 */
  header?: ReactNode
  children: ReactNode
  /** 배경 클릭·Escape 로 닫을 수 있는지. 권한 안내처럼 필수 선택이면 false. */
  isDismissable?: boolean
  onClose?: () => void
}

/**
 * 화상 화면 위에 띄우는 안내 모달.
 *
 * user 앱에는 공용 모달이 없어 이 기능 안에 둔다. 폰 화면 기준이라
 * 최대 폭을 제한하고 좌우 여백을 clamp 로 준다.
 * TODO: 다른 user 화면에도 모달이 필요해지면 shared/ui 로 올린다.
 */
export function CallDialog({
  title,
  description,
  header,
  children,
  isDismissable = false,
  onClose,
}: CallDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!isDismissable || !onClose) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isDismissable, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/45 px-[clamp(24px,8vw,40px)]',
      )}
      onClick={isDismissable ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // 카드 내부 클릭이 배경으로 전파되어 닫히는 것을 막는다.
        onClick={(event) => event.stopPropagation()}
        className="bg-surface w-full max-w-[340px] rounded-3xl px-6 py-7 text-center shadow-2xl"
      >
        {header ? (
          <div className="mb-4 flex justify-center">{header}</div>
        ) : null}

        <h2 id={titleId} className="text-ink text-[17px] font-bold">
          {title}
        </h2>
        <p className="text-ink-muted mt-2.5 text-[13px] leading-5 whitespace-pre-line">
          {description}
        </p>

        <div className="mt-6 flex gap-2">{children}</div>
      </div>
    </div>
  )
}
