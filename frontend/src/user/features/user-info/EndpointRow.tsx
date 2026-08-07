import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { FitScrollText } from '@/user/features/user-info/FitScrollText'
import { CursorArrowIcon } from '@/user/features/user-info/icons'

export interface EndpointRowProps {
  /** 한 줄로 보여줄 표기. "대구역 3층 6번 출구 앞" (describeStationPoint) */
  label: string
  icon: ReactNode
  /** 없으면 변경 버튼을 그리지 않는다. */
  onChange?: () => void
  changeLabel?: string
  /** 있으면 아이콘이 은은히 깜빡이는 버튼이 된다 (역 내 위치 지도 열기). */
  onIconClick?: () => void
  /** onIconClick 버튼의 스크린리더 라벨 */
  iconLabel?: string
  className?: string
}

/**
 * 출발지·도착지 한 줄. 아이콘 · 표기 · 변경 버튼 순으로 배치한다.
 *
 * 표기가 길어져도 변경 버튼이 밀려나지 않도록 가운데 영역만 줄어들게 한다.
 * 글자는 아이콘(36px 원)과 세로 가운데를 맞춘다.
 *
 * 표기는 언어에 따라(특히 영어) 한 줄을 넘길 만큼 길어질 수 있다. 줄바꿈 없이
 * FitScrollText 가 먼저 글자를 줄여 맞추고, 그래도 넘치면 가로 마퀴로 흘려
 * `...` 로 잘리지 않게 한다.
 */
export function EndpointRow({
  label,
  icon,
  onChange,
  changeLabel,
  onIconClick,
  iconLabel,
  className,
}: EndpointRowProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {onIconClick ? (
        <button
          type="button"
          onClick={onIconClick}
          aria-label={iconLabel}
          className="raised-brand bg-brand-soft text-brand-dark border-brand/35 focus-visible:ring-brand active:raised-brand-pressed relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition hover:brightness-105 focus-visible:ring-2 focus-visible:outline-none active:translate-y-px"
        >
          {/* 커서가 찌를 때마다 반짝이는 하이라이트 (index.css 의 hover-pulse). */}
          <span
            aria-hidden
            className="animate-hover-pulse absolute inset-0 rounded-full bg-white/25 opacity-0 motion-reduce:hidden"
          />
          {/* 커서가 닿으면 마커가 폴짝 뛴다 (index.css 의 marker-bob). */}
          <span className="animate-marker-bob relative motion-reduce:animate-none">
            {icon}
          </span>

          {/*
            버튼을 눌러 보라고 시늉하는 커서.

            ⚠️ right·bottom 값은 눈대중이 아니라 계산값이다. 커서가 끝까지 들어온
               순간(cursor-poke 의 translate) **화살표 끝점이 핀 외곽선에 딱 닿도록**
               맞춰 두었다 — 핀의 아래 꼭짓점 기준으로 오른쪽 3.8px·위 2.2px 지점,
               즉 꼭짓점을 정확히 겹치지 않고 옆구리에 살짝 대는 자리다.
               아이콘 크기(18px)나 poke 이동량을 바꾸면 이 값도 다시 잡아야 한다.

            장식이라 aria-hidden 이고, 탭이 막히지 않게 pointer-events 를 끈다.
            모션 최소화 설정에서는 통째로 감춘다.
          */}
          <CursorArrowIcon
            aria-hidden
            className="animate-cursor-poke text-ink pointer-events-none absolute -right-[6px] -bottom-[10.7px] size-[18px] drop-shadow-sm motion-reduce:hidden"
          />
        </button>
      ) : (
        <span
          aria-hidden
          // 버튼 쪽과 같은 지름이어야 두 줄의 아이콘이 세로로 맞는다.
          className="bg-brand-soft text-brand-dark flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          {icon}
        </span>
      )}

      <FitScrollText
        text={label}
        className="min-w-0 flex-1"
        textClassName="text-ink text-[clamp(15px,4.4vw,17px)] font-bold"
      />

      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="border-line text-ink-muted hover:border-brand/50 hover:text-brand-dark focus-visible:ring-brand h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-bold transition focus-visible:ring-2 focus-visible:outline-none"
        >
          {changeLabel}
        </button>
      ) : null}
    </div>
  )
}
