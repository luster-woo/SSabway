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

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** 표지판 진행 방향 화살표. 위쪽 기준이라 방향에 따라 회전해 쓴다. */
export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2.6} {...props}>
      <path d="M12 20V5" />
      <path d="M5.5 11.5L12 5l6.5 6.5" />
    </svg>
  )
}

/** 경로 재탐색 — 카메라를 다시 찍는다는 뜻으로 카메라 + 회전 화살표 */
export function RescanIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M4.7 9.1A8 8 0 0 1 19.9 11.4" />
      <path d="M17.7 9.1L19.9 11.4 21.5 8.6" />
      <path d="M19.3 15.9A8 8 0 0 1 4.1 13.6" />
      <path d="M6.3 15.9L4.1 13.6 2.5 16.4" />
      <rect x="8" y="9.5" width="8" height="6" rx="1.8" />
      <circle cx="12" cy="12.5" r="1.4" />
    </svg>
  )
}

/** 역 내 현재 위치 보기 */
export function MapPinIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2} {...props}>
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

/** 도움 요청(화상 상담) */
export function VideoIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={1.9} {...props}>
      <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
      <path d="M14.5 10.5L21.5 7v10l-7-3.5v-3Z" />
    </svg>
  )
}
