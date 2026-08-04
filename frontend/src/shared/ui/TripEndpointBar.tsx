import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

export interface TripEndpointBarProps {
  originName: string | null
  destinationName: string | null
  className?: string
}

/**
 * `출발지 → 도착지` 한 줄 표시.
 *
 * 지도 화면에서는 검색창 아래에, 경로 화면에서는 제목 아래에 붙인다.
 * 사용자가 지금 어느 구간을 보고 있는지 화면이 바뀌어도 같은 자리에서 확인할 수
 * 있어야 해서 한 컴포넌트로 공유한다.
 *
 * 두 이름을 각각 flex 로 나누지 않고 한 문장으로 흘린다 — 나누면 짧은 이름과 긴
 * 이름이 양 끝으로 밀려 "홍대입구역 3번 출구        →        명동역" 처럼
 * 사이가 벌어진다. 한 줄로 두면 이름 길이와 무관하게 화살표가 가운데 붙는다.
 * 길이가 넘치면 문장 끝에서 잘린다.
 *
 * 배경·테두리는 기본으로 두지 않는다. 지도 위처럼 글자가 묻히는 자리에서는
 * 쓰는 쪽이 className 으로 배경을 준다.
 *
 * 가운데 정렬이 기본이다. 두 지점은 대등한 정보라 왼쪽으로 몰면 화살표 위치가
 * 이름 길이에 따라 매번 달라져 시선이 흔들린다.
 */
export function TripEndpointBar({
  originName,
  destinationName,
  className,
}: TripEndpointBarProps) {
  const { t } = useTranslation()

  return (
    <p
      className={cn(
        'text-ink-muted truncate text-center text-[13.5px]',
        className,
      )}
    >
      <span className={cn(originName && 'text-ink font-semibold')}>
        {originName ?? t('trip.originEmpty')}
      </span>
      <span aria-hidden className="mx-1.5">
        →
      </span>
      <span className={cn(destinationName && 'text-ink font-semibold')}>
        {destinationName ?? t('trip.destinationEmpty')}
      </span>
    </p>
  )
}
