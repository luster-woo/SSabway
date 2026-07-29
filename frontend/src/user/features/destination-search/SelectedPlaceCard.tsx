import { useTranslation } from 'react-i18next'

import type { Place } from '@/shared/types/place'
import { Button } from '@/shared/ui'
import { PinIcon } from '@/user/features/destination-search/icons'

export interface SelectedPlaceCardProps {
  place: Place
  onConfirm: () => void
  onReset: () => void
}

/**
 * 목적지를 고른 뒤 하단에 올라오는 확인 카드.
 * 여기까지 보이는 상태가 3페이지의 완성 UI다.
 */
export function SelectedPlaceCard({
  place,
  onConfirm,
  onReset,
}: SelectedPlaceCardProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('destination.selected')}
      className="border-line bg-surface rounded-t-[24px] border-t px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.14)]"
    >
      <div className="flex items-start gap-3">
        <span className="bg-brand-soft text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-full">
          <PinIcon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-ink-muted text-[11.5px] font-semibold tracking-wide uppercase">
            {t('destination.selected')}
          </p>
          <p className="text-ink truncate text-[16px] font-bold">
            {place.name}
          </p>
          {place.address ? (
            <p className="text-ink-muted truncate text-[12.5px]">
              {place.address}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-ink-muted shrink-0 text-[12.5px] underline underline-offset-2"
        >
          {t('destination.change')}
        </button>
      </div>

      <Button size="lg" fullWidth className="mt-4" onClick={onConfirm}>
        {t('destination.next')}
      </Button>
    </section>
  )
}
