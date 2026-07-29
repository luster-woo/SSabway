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

export function SearchIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={1.9} {...props}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}
