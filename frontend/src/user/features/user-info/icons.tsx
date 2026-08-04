import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/**
 * 아이콘 공통 규칙.
 *
 * 24×24 격자에 그리고, 글자 폭을 x=12 기준으로 좌우 대칭이 되게 맞춘다.
 * 대칭을 지키지 않으면 원형 배경 안에 넣었을 때 한쪽으로 쏠려 보인다.
 * 세로 획이 겹치는 글리프(₩)는 획 간격을 stroke 두께의 2배 이상 띄운다.
 */
const BASE: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...BASE} strokeWidth={2.2} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  )
}

/** 출발지 마커 */
export function PinIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.9" />
    </svg>
  )
}

/** 도착지 깃발 */
export function FlagIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4.5 14.5s1-1 3.8-1 4.7 2 7.5 2 3.7-1 3.7-1V3.5s-1 1-3.7 1-4.7-2-7.5-2-3.8 1-3.8 1Z" />
      <path d="M4.5 21.5v-7" />
    </svg>
  )
}

/**
 * 교통카드 — 카드 소지·잔액 질문.
 *
 * 아래쪽 짧은 선은 잔액 표시를 뜻한다. 없으면 결제수단이 아니라 그냥
 * 네모로 읽혀서 남겨 둔다.
 */
export function TransitCardIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.8" />
      <path d="M3 9.5h18" />
      <path d="M6.6 14.4h4.6" />
    </svg>
  )
}

/**
 * 엘리베이터 — 승강기 칸과 위·아래 화살표.
 *
 * 화살표는 기둥까지 그려야 24px에서 방향이 읽힌다. 머리만 있으면 꺾쇠로
 * 보인다. 두 화살표의 세로 구간(y 9.6~14.4)을 맞춰 높이를 나란히 둔다.
 */
export function ElevatorIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3.5" y="2.5" width="17" height="19" rx="3" />
      <path d="M9 14.4V9.6m-1.6 1.6L9 9.6l1.6 1.6" />
      <path d="M15 9.6v4.8m-1.6-1.6 1.6 1.6 1.6-1.6" />
    </svg>
  )
}

/**
 * 준비할 일 선택 — 체크 목록.
 *
 * "무엇이 필요한가요?"에 화살표를 쓰면 다음 단계로 넘어가는 버튼처럼 보인다.
 * 고를 항목이 있다는 뜻이 드러나야 해서 목록으로 둔다.
 */
export function ChecklistIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3.5 8.1 5.6 10.2 9.4 6.4" />
      <path d="M12.5 8.2h8" />
      <path d="M3.5 16.1 5.6 18.2 9.4 14.4" />
      <path d="M12.5 16.2h8" />
    </svg>
  )
}

/**
 * 현금(원화).
 *
 * W의 폭(4.5~19.5)과 가로 두 선의 폭(3~21)을 각각 x=12 대칭으로 맞춘다.
 * 예전 그림은 W가 4~15.5인데 선은 3~19.5여서 오른쪽으로 쏠려 보였다.
 * 가로 선 간격은 4 — stroke 2 를 빼고도 2 가 남아야 두 줄로 보인다.
 */
export function WonIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4.5 6.5 8.5 17.5 12 6.5 15.5 17.5 19.5 6.5" />
      <path d="M3 10.5h18" />
      <path d="M3 14.5h18" />
    </svg>
  )
}
