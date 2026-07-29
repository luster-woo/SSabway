import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const BASE: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/** 출발지 마커 */
export function PinIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

/** 도착지 깃발 */
export function FlagIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M6 21V4" />
      <path d="M6 4.5h11l-2.2 4 2.2 4H6" />
    </svg>
  )
}

/** 교통카드 */
export function TransitCardIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  )
}

/** 엘리베이터 — 문 가운데 선과 위·아래 화살표 */
export function ElevatorIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M12 6.5v11" />
      <path d="M8.6 11 9.8 9.4 11 11" />
      <path d="M13 13.2l1.2 1.6 1.2-1.6" />
    </svg>
  )
}

/** 이동 방식 질문 */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

/** 현금(원화) */
export function WonIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M4 8.5l3 7 3-7 2.5 7 3-7" />
      <path d="M3 11.5h16.5M3 14h16.5" />
    </svg>
  )
}
