import { useTranslation } from 'react-i18next'

import { MapPinIcon } from '@/user/features/route-guide/icons'

export interface StationLocationButtonProps {
  onClick: () => void
}

/**
 * '역 내에서 현재 위치 보기' — 역 내부 2D 지도는 아직 미구현이라 UI만 둔다.
 *
 * TODO: 역 내부 지도 화면(POINT·EDGE 기반)이 붙으면 onClick을 실제 이동으로 바꾼다.
 *       (관리자 화면의 StationMap과 데이터 소스를 공유할 예정)
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
