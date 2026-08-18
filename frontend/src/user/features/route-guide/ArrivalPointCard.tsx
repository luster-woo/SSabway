import { useTranslation } from 'react-i18next'

import {
  NAV_NODE_TYPE,
  NAV_POI_CATEGORY,
  type NavNodeType,
  type NavPoiCategory,
  type NavPurpose,
} from '@/shared/types/navigation'

export interface ArrivalPointCardProps {
  arriveType: NavNodeType
  arriveCategory: NavPoiCategory | null
  /** 이 지점에서 할 일. 스쳐 지나가는 구간이면 null */
  arrivedFor: NavPurpose | null
  /** 게이트·ATM·매표소·발매기 실사 사진. 없으면 기존처럼 글자만 보여준다 */
  imageUrl?: string | null
}

/** 지점 종류별 라벨 키. POI 는 세부 종류(category)로 한 번 더 갈린다. */
const TYPE_LABEL_KEY: Record<NavNodeType, string> = {
  [NAV_NODE_TYPE.SIGNAGE]: 'routeGuide.point.signage',
  [NAV_NODE_TYPE.ELEVATOR]: 'routeGuide.point.elevator',
  [NAV_NODE_TYPE.EXIT]: 'routeGuide.point.exit',
  [NAV_NODE_TYPE.GATE]: 'routeGuide.point.gate',
  [NAV_NODE_TYPE.POI]: 'routeGuide.point.poi',
}

const CATEGORY_LABEL_KEY: Record<NavPoiCategory, string> = {
  [NAV_POI_CATEGORY.STORE]: 'routeGuide.point.store',
  [NAV_POI_CATEGORY.TICKET_OFFICE]: 'routeGuide.point.ticketOffice',
  [NAV_POI_CATEGORY.TICKET_MACHINE]: 'routeGuide.point.ticketMachine',
  [NAV_POI_CATEGORY.ATM]: 'routeGuide.point.atm',
  [NAV_POI_CATEGORY.TOILET]: 'routeGuide.point.toilet',
}

/** 지점에서 할 일. TO_GATE 는 서버가 빼고 주므로 여기 오지 않는다. */
const PURPOSE_LABEL_KEY: Record<NavPurpose, string> = {
  CHARGE: 'routeGuide.todo.charge',
  BUY_CARD: 'routeGuide.todo.buyCard',
  SINGLE_TICKET: 'routeGuide.todo.singleTicket',
  WITHDRAW_CASH: 'routeGuide.todo.withdrawCash',
  TO_GATE: 'routeGuide.todo.toGate',
}

/**
 * 표지판이 아닌 지점(개찰구·편의점·ATM·엘리베이터·출구)에 도착하는 단계.
 *
 * 표지판 카드 자리를 대신한다 — 그 자리를 비워 두면 화면이 무너지고, 표지판
 * 카드를 띄우면 있지도 않은 표지판을 찾게 된다.
 *
 * 할 일(arrivedFor)이 있으면 크게 강조한다. 편의점에 "도착만" 하는 것과
 * "거기서 카드를 사는" 것은 사용자가 취할 행동이 완전히 다르다.
 *
 * 게이트·ATM·매표소·발매기처럼 실사 사진(imageUrl)이 있으면 표지판 카드처럼
 * 사진을 채우고, 글자는 사진 위 아래쪽에 스크림을 깔아 얹는다. 사진이 없는
 * 지점(엘리베이터·편의점·화장실 등)은 기존처럼 글자만 보여준다.
 */
export function ArrivalPointCard({
  arriveType,
  arriveCategory,
  arrivedFor,
  imageUrl,
}: ArrivalPointCardProps) {
  const { t } = useTranslation()

  // POI 는 "편의시설"보다 "편의점"이 유용하다. 세부 종류가 있으면 그쪽을 쓴다.
  const labelKey =
    arriveType === NAV_NODE_TYPE.POI && arriveCategory
      ? CATEGORY_LABEL_KEY[arriveCategory]
      : TYPE_LABEL_KEY[arriveType]

  const label = (
    <>
      {arrivedFor ? (
        <p className="bg-brand-soft text-brand-dark rounded-full px-3 py-1 text-[12.5px] font-bold">
          {t(PURPOSE_LABEL_KEY[arrivedFor])}
        </p>
      ) : null}
    </>
  )

  if (imageUrl) {
    return (
      <div className="relative h-[clamp(168px,52vw,202px)] w-full overflow-hidden rounded-xl">
        <img
          src={imageUrl}
          alt={t(labelKey)}
          className="bg-sign h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 text-center">
          <p className="text-[clamp(16px,4.8vw,19px)] leading-tight font-extrabold text-white">
            {t(labelKey)}
          </p>
          {label}
        </div>
      </div>
    )
  }

  return (
    <div className="border-line bg-surface-muted flex h-[clamp(168px,52vw,202px)] flex-col items-center justify-center gap-2 rounded-xl border px-5 text-center">
      <p className="text-ink-muted text-[11.5px] font-semibold tracking-wide uppercase">
        {t('routeGuide.arriveAt')}
      </p>

      <p className="text-ink text-[clamp(18px,5.4vw,21px)] leading-tight font-extrabold">
        {t(labelKey)}
      </p>

      {label}
    </div>
  )
}
