import { useTranslation } from 'react-i18next'

import type { Place } from '@/shared/types/place'
import { Button } from '@/shared/ui'
import { PinIcon } from '@/user/features/destination-search/icons'

export interface SelectedPlaceCardProps {
  place: Place
  /** 이 장소가 이미 출발지로 설정돼 있는지 */
  isOrigin: boolean
  /** 이 장소가 이미 도착지로 설정돼 있는지 */
  isDestination: boolean
  /** 출발지·도착지가 모두 정해졌는지. 다음 단계로 갈 수 있는 조건이다. */
  canProceed: boolean
  onSetOrigin: () => void
  onSetDestination: () => void
  onConfirm: () => void
  onReset: () => void
}

/**
 * 지도에서 장소를 고르면 하단에 올라오는 카드.
 *
 * 한 장소를 출발지로도 도착지로도 지정할 수 있어 버튼을 두 개 둔다 —
 * "구미역"을 골랐을 때 그것이 출발인지 도착인지는 사용자만 안다.
 * 이미 지정된 쪽 버튼은 눌린 상태로 보여 지금 무엇이 정해졌는지 알려준다.
 *
 * [다음]은 두 지점이 모두 정해져야 열린다. 하나만 정하고 넘어가면 경로 조회가
 * 무엇을 기준으로 계산해야 할지 알 수 없다.
 */
export function SelectedPlaceCard({
  place,
  isOrigin,
  isDestination,
  canProceed,
  onSetOrigin,
  onSetDestination,
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
          <p className="text-ink truncate text-[16px] font-bold">{place.name}</p>
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

      {/* 이 장소를 출발/도착 중 무엇으로 쓸지 고른다. 둘 다 지정해도 된다. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          size="lg"
          variant={isOrigin ? 'primary' : 'secondary'}
          onClick={onSetOrigin}
          aria-pressed={isOrigin}
        >
          {isOrigin ? t('destination.originSet') : t('destination.setOrigin')}
        </Button>
        <Button
          size="lg"
          variant={isDestination ? 'primary' : 'secondary'}
          onClick={onSetDestination}
          aria-pressed={isDestination}
        >
          {isDestination
            ? t('destination.destinationSet')
            : t('destination.setDestination')}
        </Button>
      </div>

      <Button
        size="lg"
        fullWidth
        className="mt-2"
        disabled={!canProceed}
        onClick={onConfirm}
      >
        {canProceed ? t('destination.next') : t('destination.needBoth')}
      </Button>
    </section>
  )
}
