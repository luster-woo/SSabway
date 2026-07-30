import { useTranslation } from 'react-i18next'

import { VideoIcon } from '@/user/features/route-guide/icons'

export interface HelpRequestButtonProps {
  /** 역무원 화상 상담 화면으로 이동한다. */
  onClick: () => void
}

/** 길을 잃었을 때 누르는 도움 요청 버튼. 안내 중 항상 손에 닿는 위치에 둔다. */
export function HelpRequestButton({ onClick }: HelpRequestButtonProps) {
  const { t } = useTranslation()
  const label = t('routeGuide.help')

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="bg-brand-gradient focus-visible:ring-brand flex size-16 items-center justify-center rounded-full text-white shadow-[0_6px_16px_rgba(2,69,122,0.28)] transition active:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <VideoIcon className="size-7" />
      </button>
      <span aria-hidden className="text-ink-muted text-[11px]">
        {label}
      </span>
    </div>
  )
}
