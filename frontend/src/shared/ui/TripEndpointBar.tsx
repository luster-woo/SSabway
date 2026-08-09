import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

export interface TripEndpointBarProps {
  originName: string | null
  destinationName: string | null
  /**
   * 출발지 이름을 누르면 부를 함수. 없으면 그냥 글자로 그린다.
   *
   * 지도 화면에서 "그 지점을 화면에 맞춰 달라"는 뜻으로 쓴다. 지도가 없는
   * 화면(경로 선택)에서는 누를 곳이 없어야 하므로 선택 항목으로 둔다.
   */
  onOriginClick?: () => void
  /** 도착지 이름을 누르면 부를 함수. 없으면 그냥 글자로 그린다. */
  onDestinationClick?: () => void
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
  onOriginClick,
  onDestinationClick,
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
      <TripEndpoint
        name={originName}
        emptyLabel={t('trip.originEmpty')}
        actionLabel={t('trip.focusOrigin')}
        onClick={onOriginClick}
      />
      <span aria-hidden className="mx-1.5">
        →
      </span>
      <TripEndpoint
        name={destinationName}
        emptyLabel={t('trip.destinationEmpty')}
        actionLabel={t('trip.focusDestination')}
        onClick={onDestinationClick}
      />
    </p>
  )
}

interface TripEndpointProps {
  name: string | null
  /** 아직 정해지지 않았을 때 대신 보여줄 안내 문구. */
  emptyLabel: string
  /** 눌렀을 때 무엇이 일어나는지 알려 주는 스크린리더용 설명. */
  actionLabel: string
  onClick?: () => void
}

/**
 * 한쪽 지점(출발지 또는 도착지) 한 조각.
 *
 * 아직 정해지지 않았으면 누를 수 없다 — 맞출 좌표가 없어 눌러도 아무 일이
 * 일어나지 않는데, 눌리는 모양만 남으면 고장으로 보인다.
 *
 * 누를 수 있을 때만 점선 밑줄을 깐다. 지도 위 한 줄짜리 표시라 버튼처럼 테두리를
 * 두르면 검색창과 무게가 비슷해져 어느 쪽이 주된 입력인지 흐려진다.
 */
function TripEndpoint({
  name,
  emptyLabel,
  actionLabel,
  onClick,
}: TripEndpointProps) {
  const isTappable = Boolean(name) && Boolean(onClick)
  const nameClass = cn(name && 'text-ink font-semibold')

  if (!isTappable) {
    return <span className={nameClass}>{name ?? emptyLabel}</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${name ?? ''} — ${actionLabel}`}
      className={cn(
        nameClass,
        // align-baseline: 기본 inline-block 버튼은 글자 기준선이 어긋나 화살표와
        // 높이가 안 맞는다.
        'cursor-pointer align-baseline underline decoration-dotted underline-offset-4 transition active:opacity-60',
      )}
    >
      {name}
    </button>
  )
}
