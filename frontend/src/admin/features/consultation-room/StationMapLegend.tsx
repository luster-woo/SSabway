import type { ReactNode } from 'react'

interface FacilityLegendItem {
  label: string
  /** 도면 SVG 의 facility-bg 원 색과 같은 값 */
  color: string
  icon: ReactNode
}

/**
 * 시설 아이콘 범례.
 *
 * 색과 아이콘은 도면 SVG(stationMapData.ts)의 facility 마커와 같은 값이다.
 * 도면이 교체되면 이 목록도 함께 맞춰야 한다.
 */
const FACILITIES: readonly FacilityLegendItem[] = [
  {
    label: '에스컬레이터·계단',
    color: '#8656c4',
    icon: (
      <>
        <path d="M-6,6 H-2 V2 H2 V-2 H6 V-6" />
        <path d="M-6,6 L6,-6" strokeDasharray="1.6 1.8" opacity=".7" />
      </>
    ),
  },
  {
    label: '엘리베이터',
    color: '#5b6fd6',
    icon: (
      <>
        <rect x="-5.5" y="-6.5" width="11" height="13" rx="1.6" />
        <polygon points="0,-4.6 -2,-1.8 2,-1.8" className="fac-fill" />
        <polygon points="0,4.6 -2,1.8 2,1.8" className="fac-fill" />
      </>
    ),
  },
  {
    label: '개찰구',
    color: '#d1567e',
    icon: (
      <>
        <path d="M-6.5,-5 H6.5 M-4,-5 V6.5 M4,-5 V6.5" />
        <path d="M-4,0.5 H4" opacity=".85" />
      </>
    ),
  },
  {
    label: '승차권 발매기',
    color: '#2f9ea3',
    icon: (
      <>
        <rect x="-5" y="-7" width="10" height="14" rx="1.4" />
        <rect x="-3" y="-5" width="6" height="3.8" rx="0.5" />
        <path d="M-2.6,2 H2.6" />
        <rect
          x="-1.6"
          y="3.6"
          width="3.2"
          height="1.6"
          rx="0.4"
          className="fac-fill"
        />
      </>
    ),
  },
  {
    label: '매표소',
    color: '#8a5a3c',
    icon: (
      <>
        <circle cx="0" cy="-3.6" r="2.1" className="fac-fill" />
        <polygon
          points="-2.8,0.6 2.8,0.6 1.7,-2.4 -1.7,-2.4"
          className="fac-fill"
        />
        <rect
          x="-6.4"
          y="1"
          width="12.8"
          height="2.3"
          rx="0.7"
          className="fac-fill"
        />
      </>
    ),
  },
  {
    label: '화장실',
    color: '#2f74b5',
    icon: (
      <>
        <circle cx="-2.7" cy="-3.9" r="1.7" className="fac-fill" />
        <polygon points="-4.7,6.3 -0.7,6.3 -2.7,-0.7" className="fac-fill" />
        <circle cx="2.7" cy="-3.9" r="1.7" className="fac-fill" />
        <polygon points="0.7,6.3 4.7,6.3 2.7,-0.7" className="fac-fill" />
      </>
    ),
  },
]

/** 시설 아이콘 하나. 도면과 같은 모양을 작게 그린다. */
function FacilityIcon({ color, icon }: Omit<FacilityLegendItem, 'label'>) {
  return (
    <svg viewBox="-16 -16 32 32" aria-hidden className="size-[22px] shrink-0">
      <circle
        r="15"
        fill={color}
        stroke="rgba(255,255,255,.55)"
        strokeWidth="1.6"
      />
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[&_.fac-fill]:fill-white [&_.fac-fill]:stroke-none"
      >
        {icon}
      </g>
    </svg>
  )
}

/** 지도 아래에 놓는 시설 범례 */
export function StationMapLegend() {
  return (
    <div className="border-line bg-surface-muted rounded-2xl border px-4 py-3.5">
      <p className="text-ink-muted text-[12px] font-bold">시설</p>
      <ul className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-2.5">
        {FACILITIES.map((facility) => (
          <li
            key={facility.label}
            className="text-ink-muted flex items-center gap-1.5 text-[12px]"
          >
            <FacilityIcon color={facility.color} icon={facility.icon} />
            <span className="truncate">{facility.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
