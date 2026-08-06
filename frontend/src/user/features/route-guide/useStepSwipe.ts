import { useRef, useState, type PointerEvent } from 'react'

/** 스와이프로 인정할 최소 가로 이동(px). 이보다 짧게 놓으면 제자리로 돌아간다. */
const SWIPE_MIN_DISTANCE = 48

/** 가로/세로 의도를 판정하기까지의 유예(px). 그 전에는 아무 축도 잠그지 않는다. */
const AXIS_LOCK_DISTANCE = 8

/** 경계 밖(첫 단계에서 이전, 마지막에서 다음)으로 끌 때 따라오는 비율의 분모. */
const EDGE_RESISTANCE = 3

export interface StepSwipeOptions {
  /** 왼쪽으로 밀어 확정했을 때(다음 단계) */
  onSwipeLeft: () => void
  /** 오른쪽으로 밀어 확정했을 때(이전 단계) */
  onSwipeRight: () => void
  /** false 면 왼쪽 스와이프를 확정하지 않고, 드래그도 저항이 걸린다. */
  canSwipeLeft: boolean
  /** false 면 오른쪽 스와이프를 확정하지 않고, 드래그도 저항이 걸린다. */
  canSwipeRight: boolean
}

/**
 * 표지판 카드를 좌우로 끌어 단계를 넘기는 제스처.
 *
 * 카드가 손가락을 따라오도록 드래그 오프셋(dragX)을 노출한다. 붙이는 쪽은
 * 트랙의 translateX 에 dragX 를 더하고, isDragging 이 아닐 때만 transition 을
 * 걸면 놓는 순간 새 단계(또는 제자리)로 미끄러진다.
 *
 * Pointer Events 라 터치·마우스를 함께 받는다. 붙이는 쪽에서 `touch-pan-y` 를
 * 함께 줘야 한다 — 세로 스크롤은 브라우저에 남기고(스크롤이 시작되면
 * pointercancel 로 스와이프가 취소된다) 가로 제스처만 여기로 온다.
 */
export function useStepSwipe({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
}: StepSwipeOptions) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const startRef = useRef<{ x: number; y: number } | null>(null)
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null)

  const settle = () => {
    startRef.current = null
    axisRef.current = null
    setIsDragging(false)
    setDragX(0)
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    // 사진(img)의 네이티브 드래그가 이후 이벤트를 삼키지 않도록 막는다.
    event.preventDefault()
    // 손가락이 카드 밖으로 나가도 move·up 을 이 요소가 계속 받게 한다.
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = { x: event.clientX, y: event.clientY }
    axisRef.current = null
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = startRef.current
    if (!start) return

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y

    /*
      첫 이동 방향으로 축을 한 번만 잠근다. 세로로 판정되면 이 제스처가 끝날
      때까지 카드를 움직이지 않는다 — 스크롤 중에 카드가 흔들리면 안 된다.
    */
    if (axisRef.current === null) {
      if (
        Math.abs(deltaX) < AXIS_LOCK_DISTANCE &&
        Math.abs(deltaY) < AXIS_LOCK_DISTANCE
      )
        return
      axisRef.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
      if (axisRef.current === 'horizontal') setIsDragging(true)
    }
    if (axisRef.current !== 'horizontal') return

    // 더 갈 곳이 없는 방향은 일부만 따라오게 해 "여기가 끝"임을 보여준다.
    const blocked =
      (deltaX < 0 && !canSwipeLeft) || (deltaX > 0 && !canSwipeRight)
    setDragX(blocked ? deltaX / EDGE_RESISTANCE : deltaX)
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = startRef.current
    const wasHorizontal = axisRef.current === 'horizontal'
    settle()
    if (!start || !wasHorizontal) return

    const deltaX = event.clientX - start.x
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return

    if (deltaX < 0 && canSwipeLeft) onSwipeLeft()
    if (deltaX > 0 && canSwipeRight) onSwipeRight()
  }

  return {
    /** 드래그 중 손가락을 따라가는 가로 오프셋(px). 놓으면 0 으로 돌아간다. */
    dragX,
    /** 가로 드래그 중인지. 트랙 transition 을 끄는 데 쓴다. */
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: settle,
    },
  }
}
