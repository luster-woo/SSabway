import { useTranslation } from 'react-i18next'

import type { Place } from '@/shared/types/place'
import { Button } from '@/shared/ui'
import { PinIcon } from '@/user/features/destination-search/icons'

export interface SelectedPlaceCardProps {
  place: Place
  /** 이 장소를 목적지로 확정하고 경로 선택 화면으로 넘어간다. */
  onConfirm: () => void
}

/**
 * 지도에서 장소를 고르면 하단에 올라오는 카드.
 *
 * 이 화면에서 정하는 것은 목적지 하나뿐이다 — 출발지는 표지판 인식으로 잡힌
 * 현재 역을 그대로 쓴다. 장소를 고른 뒤 [도착지로 설정]을 누르면 그 즉시
 * 경로 선택 화면으로 넘어간다. 다른 목적지로 바꾸려면 위 목록에서 다른 후보를
 * 고르거나 검색을 다시 하면 된다.
 */
export function SelectedPlaceCard({
  place,
  onConfirm,
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
          <p className="text-ink truncate text-[16px] font-bold">{place.name}</p>
          {place.address ? (
            <p className="text-ink-muted truncate text-[12.5px]">
              {place.address}
            </p>
          ) : null}
        </div>
      </div>

      {/* 목적지만 정하면 바로 다음 화면으로 넘어간다. */}
      <Button size="lg" fullWidth className="mt-3" onClick={onConfirm}>
        {t('destination.setDestination')}
      </Button>
    </section>
  )
}
