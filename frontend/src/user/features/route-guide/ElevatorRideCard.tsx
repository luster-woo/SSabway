import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import {
  ELEVATOR_DIRECTION,
  type ElevatorDirection,
} from '@/shared/types/routeGuide'
import { ChevronDownIcon } from '@/user/features/route-guide/icons'

export interface ElevatorRideCardProps {
  /** 오르내림. 이 카드는 타고 가는 구간에만 쓰이므로 항상 정해져 있다. */
  direction: ElevatorDirection
}

/** 꺾쇠 셋의 시작 시점. 주기(1.2s)를 셋으로 잘게 나눠 흐르듯 이어진다. */
const CHEVRON_DELAYS = ['0ms', '150ms', '300ms']

/**
 * 엘리베이터를 타고 층을 옮기는 구간의 카드.
 *
 * 이 구간만 BE 가 사진을 주지 않는다 — 타기 직전(복도 → 엘리베이터)에 이미
 * 같은 사진을 보여줬는데 내린 직후에도 또 나오면 같은 것이 연달아 두 번 뜬다
 * (NavigationService.buildImageUrl 주석). 그래서 여태 글자만 남던 자리였고,
 * 여기에 오르내림이 보이는 그림을 넣는다.
 *
 * 글자는 없다 — 바로 아래 안내 카드가 "엘리베이터를 통해 1층으로 내려가세요"를
 * 이미 말하고 있어서, 같은 말을 두 번 하는 대신 그림만 남긴다. 대신 보조기기는
 * 그림을 읽지 못하므로 sr-only 로 종류와 방향을 함께 남긴다.
 *
 * 올라갈 때는 줄무늬를 reverse 로 돌리고 꺾쇠 묶음을 통째로 뒤집어 모양과
 * **흐르는 순서**를 함께 돌린다 — 딜레이를 반대로 매기는 것보다 어긋날 여지가
 * 없다.
 */
export function ElevatorRideCard({ direction }: ElevatorRideCardProps) {
  const { t } = useTranslation()

  const isUp = direction === ELEVATOR_DIRECTION.UP

  return (
    <div className="border-line bg-surface-muted relative flex h-[clamp(168px,52vw,202px)] items-center justify-center gap-[clamp(28px,9vw,44px)] overflow-hidden rounded-xl border">
      {/*
        지나가는 층 표시. 80px 간격의 줄무늬를 같은 80px 만큼 밀어 이어 붙는
        자리를 감춘다. 위아래로 한 칸씩 넉넉히 빼 둬야 미는 동안 끝이 비지 않는다.

        간격은 카드 높이(168~202px)에 줄이 두셋만 걸리도록 잡았다 — 촘촘하면
        연회색 위에서 격자무늬처럼 보여 지나가는 층으로 읽히지 않는다.
      */}
      <div
        aria-hidden
        className={cn(
          'animate-elevator-shaft absolute inset-x-0 -top-[80px] -bottom-[80px] motion-reduce:animate-none',
          isUp && '[animation-direction:reverse]',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, color-mix(in srgb, var(--color-ink-faint) 38%, transparent) 0 2px, transparent 2px 80px)',
        }}
      />

      <span className="sr-only">
        {t('routeGuide.point.elevator')}
        {' · '}
        {t(isUp ? 'routeGuide.elevator.up' : 'routeGuide.elevator.down')}
      </span>

      {/* 문틀 — 문보다 진해야 문이 안쪽으로 들어가 보인다 */}
      <div
        aria-hidden
        className="border-ink bg-ink-faint relative h-[clamp(124px,38vw,150px)] w-[clamp(102px,31vw,124px)] shrink-0 rounded-[4px] border-2 p-[7px] shadow-md"
      >
        {/* 문 — 인방(引枋) 아래로 두 짝이 가운데서 갈린다 */}
        <div className="border-ink flex h-full flex-col overflow-hidden rounded-[2px] border-2">
          <div className="border-ink bg-brand/35 h-[11px] shrink-0 border-b-2" />
          <div className="bg-brand-soft flex flex-1">
            <div className="border-ink flex-1 border-r-2" />
            <div className="flex-1" />
          </div>
        </div>
      </div>

      <span
        aria-hidden
        className={cn(
          'text-brand relative flex flex-col items-center',
          isUp && 'rotate-180',
        )}
      >
        {CHEVRON_DELAYS.map((delay) => (
          <ChevronDownIcon
            key={delay}
            className="animate-elevator-chevron -my-[4px] size-10 motion-reduce:animate-none"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>
    </div>
  )
}
