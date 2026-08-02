import { useTranslation } from 'react-i18next'

import { MapPinIcon } from '@/user/features/route-guide/icons'

export interface StationLocationButtonProps {
  onClick: () => void
}

/**
 * '역 내에서 현재 위치 보기' — StationMapOverlay(역 내 지도)를 연다.
 * 지도는 관리자 화면과 같은 shared/station-map 도면·경로를 쓴다.
 */
export function StationLocationButton({
  onClick,
}: StationLocationButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-brand bg-surface text-brand-dark focus-visible:ring-brand flex h-[clamp(50px,15vw,56px)] w-full items-center justify-center gap-2 rounded-xl border-[1.6px] text-[clamp(13.5px,4.2vw,14.5px)] font-bold transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
    >
      <MapPinIcon className="size-[18px]" />
      {t('routeGuide.showMyLocation')}
    </button>
  )
}
