import { useTranslation } from 'react-i18next'

import { RescanIcon } from '@/user/features/route-guide/icons'

export interface RescanButtonProps {
  /** 표지판 촬영 화면으로 보내 경로를 다시 계산한다. */
  onClick: () => void
}

/** 경로 재탐색 — 지금 위치가 안내와 어긋날 때 표지판을 다시 찍는다. */
export function RescanButton({ onClick }: RescanButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink-muted focus-visible:ring-brand -mr-1 flex h-9 items-center gap-1 rounded-full px-1.5 text-[11px] font-bold transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
    >
      <RescanIcon className="text-brand-dark size-[22px]" />
      {t('routeGuide.rescan')}
    </button>
  )
}
