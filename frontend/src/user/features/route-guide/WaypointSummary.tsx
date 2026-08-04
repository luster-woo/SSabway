import { useTranslation } from 'react-i18next'

import {
  NAV_POI_CATEGORY,
  type NavPoiCategory,
  type NavWaypoint,
} from '@/shared/types/navigation'

export interface WaypointSummaryProps {
  totalDistanceM: number
  waypoints: readonly NavWaypoint[]
}

const CATEGORY_LABEL_KEY: Record<NavPoiCategory, string> = {
  [NAV_POI_CATEGORY.STORE]: 'routeGuide.point.store',
  [NAV_POI_CATEGORY.TICKET_OFFICE]: 'routeGuide.point.ticketOffice',
  [NAV_POI_CATEGORY.TICKET_MACHINE]: 'routeGuide.point.ticketMachine',
  [NAV_POI_CATEGORY.ATM]: 'routeGuide.point.atm',
  [NAV_POI_CATEGORY.TOILET]: 'routeGuide.point.toilet',
}

/**
 * 경로 전체 요약 — 총 거리와 개찰구 전에 들를 곳.
 *
 * 단계는 한 번에 하나씩만 보여서, 사용자는 "앞으로 얼마나 남았고 어디를
 * 들르는지"를 알 수 없다. 서버가 이 둘을 최상위에 따로 주는 이유이기도 하다
 * (RouteResponse 주석: "경로 전체에 하나뿐인 값은 여기 두고").
 *
 * 들를 곳이 없으면(바로 탑승) 거리만 보여준다.
 */
export function WaypointSummary({
  totalDistanceM,
  waypoints,
}: WaypointSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className="border-line bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border px-3.5 py-2.5">
      <span className="text-ink text-[13px] font-bold">
        {t('routeGuide.totalDistance', { meters: totalDistanceM })}
      </span>

      {waypoints.length > 0 ? (
        <>
          <span aria-hidden className="text-ink-muted text-[12px]">
            ·
          </span>
          <span className="text-ink-muted text-[12.5px]">
            {t('routeGuide.viaCount', { count: waypoints.length })}
          </span>

          {/* 방문 순서대로. 서버가 순서를 보장하므로 그대로 이어 붙인다. */}
          <span className="text-brand-dark text-[12.5px] font-semibold">
            {waypoints
              .map((waypoint) => t(CATEGORY_LABEL_KEY[waypoint.category]))
              .join(' → ')}
          </span>
        </>
      ) : null}
    </div>
  )
}
