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

export function CheckIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11.5v5" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={1.9} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={1.9} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m20 20-4.4-4.4" />
    </svg>
  )
}

/** 금지 표식(원 + 사선). 블랙리스트 관련 진입점에 쓴다. */
export function BanIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m5.9 5.9 12.2 12.2" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2.2} {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M9.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4h3" />
      <path d="m15.5 8 4 4-4 4M19.5 12H9.5" />
    </svg>
  )
}
