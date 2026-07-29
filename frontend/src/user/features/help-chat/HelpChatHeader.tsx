import { useTranslation } from 'react-i18next'

export interface HelpChatHeaderProps {
  onBack: () => void
}

/** 도우미 헤더 — 뒤로가기 · 아바타(S) · 이름 · 온라인 표시 */
export function HelpChatHeader({ onBack }: HelpChatHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="border-line bg-surface flex shrink-0 items-center gap-2 border-b px-[clamp(16px,5vw,24px)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3">
      <button
        type="button"
        aria-label={t('helpChat.back')}
        onClick={onBack}
        className="text-ink -ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-2xl"
      >
        ‹
      </button>

      <span
        aria-hidden
        className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
      >
        S
      </span>

      <div className="min-w-0">
        <p className="text-ink text-[15.5px] leading-tight font-bold">
          {t('helpChat.title')}
        </p>
        <p className="text-ink-muted flex items-center gap-1 text-[11px]">
          <span aria-hidden className="bg-success size-[7px] rounded-full" />
          {t('helpChat.online')}
        </p>
      </div>
    </header>
  )
}
