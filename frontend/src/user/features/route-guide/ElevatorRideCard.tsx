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
 * **카드 전체가 승강로다.** 문(문틀·인방·가운데로 갈린 두 짝)이 그 안에 떠 있고
 * 뒤로 층 표시가 흘러간다. 움직이는 것은 문이 아니라 승강로다 — 문을 상자 안에서
 * 오르내리게 하면 한 바퀴 돌 때마다 반대편 끝에서 다시 나타나 순간이동처럼
 * 보인다(index.css 의 elevator-shaft).
 *
 * 올라갈 때는 승강로를 reverse 로 돌리고 꺾쇠 묶음을 통째로 뒤집어 모양과
 * **흐르는 순서**를 함께 돌린다 — 딜레이를 반대로 매기는 것보다 어긋날 여지가
 * 없다.
 */
export function ElevatorRideCard({ direction }: ElevatorRideCardProps) {
  const { t } = useTranslation()

  const isUp = direction === ELEVATOR_DIRECTION.UP

  return (
    <div className="bg-brand-dark relative flex h-[clamp(168px,52vw,202px)] items-center justify-center gap-[clamp(18px,5.5vw,26px)] overflow-hidden rounded-xl">
      {/*
        지나가는 층 표시. 20px 간격의 줄무늬를 같은 20px 만큼 밀어 이어 붙는
        자리를 감춘다. 위아래로 한 칸씩 넉넉히 빼 둬야 미는 동안 끝이 비지 않는다.
      */}
      <div
        aria-hidden
        className={cn(
          'animate-elevator-shaft absolute inset-x-0 -top-[20px] -bottom-[20px] motion-reduce:animate-none',
          isUp && '[animation-direction:reverse]',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.16) 0 2px, transparent 2px 20px)',
        }}
      />

      {/*
        그림은 장식이라 읽어 주지 않는다. 대신 무엇에 도착하는 구간인지는
        남겨야 해서(화면에서 "엘리베이터" 글자를 뺐다) 라벨만 따로 붙인다.
      */}
      <span className="sr-only">{t('routeGuide.point.elevator')}</span>

      {/* 문틀 — 문보다 진해야 문이 안쪽으로 들어가 보인다 */}
      <div
        aria-hidden
        className="border-ink bg-ink-faint relative h-[clamp(102px,31vw,120px)] w-[clamp(84px,25vw,100px)] shrink-0 rounded-[4px] border-2 p-[6px] shadow-lg"
      >
        {/* 문 — 인방(引枋) 아래로 두 짝이 가운데서 갈린다 */}
        <div className="border-ink flex h-full flex-col overflow-hidden rounded-[2px] border-2">
          <div className="border-ink bg-brand/35 h-[10px] shrink-0 border-b-2" />
          <div className="bg-brand-soft flex flex-1">
            <div className="border-ink flex-1 border-r-2" />
            <div className="flex-1" />
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        {/* 어두운 승강로 위라 문과 같은 연한 하늘색이 가장 또렷하다 */}
        <span
          aria-hidden
          className={cn(
            'text-brand-soft flex flex-col items-center',
            isUp && 'rotate-180',
          )}
        >
          {CHEVRON_DELAYS.map((delay) => (
            <ChevronDownIcon
              key={delay}
              className="animate-elevator-chevron -my-[2px] size-5 motion-reduce:animate-none"
              style={{ animationDelay: delay }}
            />
          ))}
        </span>

        <p className="text-[clamp(16px,4.8vw,19px)] leading-tight font-extrabold text-white">
          {t(isUp ? 'routeGuide.elevator.up' : 'routeGuide.elevator.down')}
        </p>
      </div>
    </div>
  )
}
