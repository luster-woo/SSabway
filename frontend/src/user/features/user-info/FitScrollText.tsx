import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { cn } from '@/shared/lib/cn'

/** 한 줄에 안 들어갈 때 줄여도 되는 최소 글자 크기(px). 이보다 작아지면 마퀴로 넘긴다. */
const MIN_FONT_PX = 11

/**
 * 마퀴 이동 속도(px/초, 한 방향 기준). 값이 클수록 빨리 흐른다.
 * 왕복 사이의 멈춤은 keyframes(eprow-marquee)의 평탄 구간이 만든다.
 */
const MARQUEE_SPEED = 42

/** 마퀴 한 바퀴(왕복+양끝 멈춤)의 최소·최대 길이(초). 너무 짧아 정신없거나 늘어지지 않게 가둔다. */
const MARQUEE_MIN_SEC = 5
const MARQUEE_MAX_SEC = 16

export interface FitScrollTextProps {
  /** 한 줄로 보여줄 문구 */
  text: string
  /** 바깥 컨테이너(레이아웃)용 className — 보통 `min-w-0 flex-1` */
  className?: string
  /** 글자(색·크기·굵기)용 className */
  textClassName?: string
}

/**
 * 한 줄 텍스트를 폭에 맞춰 보여준다. 긴 언어(특히 영어)에서 `...` 로 잘리는 것을
 * 막기 위한 두 단계 안전망이다.
 *
 * 1. **폰트 자동 축소(fit-to-width)** — 기준 크기로 재서 한 줄에 넘치면, 넘치는
 *    비율만큼 글자를 줄인다. 하한은 {@link MIN_FONT_PX}. (줄바꿈은 쓰지 않는다)
 * 2. **가로 마퀴** — 최소 크기로 줄여도 여전히 넘치면, 넘치는 만큼만 좌우로 천천히
 *    흐르게 해 전문을 다 볼 수 있게 한다. `prefers-reduced-motion` 이면 애니메이션
 *    대신 손가락으로 밀어 볼 수 있게 가로 스크롤을 연다.
 *
 * 측정은 `useLayoutEffect` 에서 페인트 전에 끝내므로 넘친 상태가 한 프레임 보이지
 * 않는다. 컨테이너 폭 변화(화면 회전·주소창)는 ResizeObserver 로, 문구 변화(언어
 * 전환)는 text 의존성으로 다시 잰다. 웹폰트(Pretendard)가 늦게 로드되면 폭이
 * 달라지므로 `document.fonts.ready` 후 한 번 더 잰다.
 */
export function FitScrollText({
  text,
  className,
  textClassName,
}: FitScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)

  /** 최소 크기로 줄여도 넘치는 폭(px). 0 이면 한 줄에 다 들어간다(마퀴 없음). */
  const [overflow, setOverflow] = useState(0)
  /** 마퀴 한 바퀴 길이(초). overflow 에 비례해 속도를 일정하게 유지한다. */
  const [duration, setDuration] = useState(0)

  useLayoutEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    const fit = () => {
      // 1) 기준(clamp) 크기로 되돌려 실제 자연 폭을 잰다.
      track.style.fontSize = ''
      const available = container.clientWidth
      if (available === 0) return

      const basePx = parseFloat(getComputedStyle(track).fontSize)
      let natural = track.scrollWidth

      // 2) 한 줄에 안 들어가면 넘치는 비율만큼 글자를 줄인다(하한까지).
      if (natural > available) {
        const shrunk = Math.max(MIN_FONT_PX, (basePx * available) / natural)
        track.style.fontSize = `${String(shrunk)}px`
        natural = track.scrollWidth
      }

      // 3) 최소 크기로도 넘치면 그 초과분만큼 마퀴로 흐르게 한다.
      const excess = Math.max(0, Math.ceil(natural - available))
      setOverflow(excess)
      setDuration(
        excess > 0
          ? Math.min(
              MARQUEE_MAX_SEC,
              Math.max(MARQUEE_MIN_SEC, (excess / MARQUEE_SPEED) * 2.6),
            )
          : 0,
      )
    }

    fit()

    const observer = new ResizeObserver(fit)
    observer.observe(container)
    // 웹폰트 로드 후 글자 폭이 바뀔 수 있어 한 번 더 맞춘다.
    document.fonts?.ready.then(fit).catch(() => undefined)

    return () => {
      observer.disconnect()
    }
  }, [text])

  const isMarquee = overflow > 0

  const marqueeStyle: CSSProperties = {
    // keyframes(eprow-marquee)가 참조하는 이동 거리(왼쪽으로 초과분만큼).
    ['--eprow-shift' as string]: `-${String(overflow)}px`,
    animationName: 'eprow-marquee',
    animationDuration: `${String(duration)}s`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-hidden',
        // 모션을 끈 사용자는 애니메이션 대신 손가락으로 밀어 읽는다.
        isMarquee && 'motion-reduce:overflow-x-auto',
        className,
      )}
    >
      <span
        ref={trackRef}
        className={cn(
          'block w-max whitespace-nowrap',
          isMarquee && 'will-change-transform motion-reduce:animate-none',
          textClassName,
        )}
        style={isMarquee ? marqueeStyle : undefined}
      >
        {text}
      </span>
    </div>
  )
}
