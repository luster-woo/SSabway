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
