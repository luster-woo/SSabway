import { useEffect, useId, type ReactNode } from 'react'

export interface ModalProps {
  title: string
  /** 본문. 폼을 넣는 경우 제출 버튼도 함께 넣는다. */
  children: ReactNode
  onClose: () => void
}

/**
 * 관리자 화면의 단일 모달.
 *
 * 데스크톱 전용이라 화면 가운데에 고정하고, Escape 와 배경 클릭으로 닫는다.
 * 열려 있는 동안 배경 스크롤을 막는다.
 */
export function Modal({ title, children, onClose }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface w-[440px] rounded-3xl p-7 shadow-2xl"
        // 카드 내부 클릭이 배경으로 전파되어 모달이 닫히는 것을 막는다.
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-ink text-[17px] font-bold">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}
