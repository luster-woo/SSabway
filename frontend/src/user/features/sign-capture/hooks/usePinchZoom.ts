import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

/** 두 손가락 사이 거리 */
function getPinchDistance(touches: TouchList): number {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
  )
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export interface UsePinchZoomResult {
  zoom: number
  resetZoom: () => void
}

/**
 * 핀치 제스처로 배율을 계산한다. 실제 확대는 호출부가 CSS transform으로 한다.
 *
 * MediaStreamTrack의 네이티브 zoom 제약은 iOS Safari가 지원하지 않으므로
 * 전 기기에서 동일하게 동작하는 디지털 줌 방식을 쓴다.
 *
 * @param targetRef 제스처를 받을 요소
 * @param enabled false면 리스너를 붙이지 않는다 (촬영 후 등)
 */
export function usePinchZoom(
  targetRef: RefObject<HTMLElement | null>,
  enabled = true,
): UsePinchZoomResult {
  const [zoom, setZoom] = useState(MIN_ZOOM)
  // 제스처 시작 시점의 거리·배율. 리스너가 최신 zoom을 보도록 ref로 둔다.
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null)
  const zoomRef = useRef(MIN_ZOOM)

  const resetZoom = useCallback(() => {
    pinchStartRef.current = null
    zoomRef.current = MIN_ZOOM
    setZoom(MIN_ZOOM)
  }, [])

  useEffect(() => {
    const target = targetRef.current
    if (!target || !enabled) return

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      pinchStartRef.current = {
        distance: getPinchDistance(event.touches),
        zoom: zoomRef.current,
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const pinchStart = pinchStartRef.current
      if (!pinchStart || pinchStart.distance === 0) return
      if (event.touches.length !== 2) return
      // 브라우저의 페이지 확대를 막는다 — passive: false로 등록해야 동작한다
      event.preventDefault()
      const ratio = getPinchDistance(event.touches) / pinchStart.distance
      const next = clampZoom(pinchStart.zoom * ratio)
      zoomRef.current = next
      setZoom(next)
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchStartRef.current = null
    }

    // iOS Safari 전용 확대 제스처. touch-action만으로 막히지 않는 경우가 있다.
    const preventGesture = (event: Event) => event.preventDefault()

    target.addEventListener('touchstart', handleTouchStart, { passive: false })
    target.addEventListener('touchmove', handleTouchMove, { passive: false })
    target.addEventListener('touchend', handleTouchEnd)
    target.addEventListener('touchcancel', handleTouchEnd)
    target.addEventListener('gesturestart', preventGesture)
    target.addEventListener('gesturechange', preventGesture)

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchmove', handleTouchMove)
      target.removeEventListener('touchend', handleTouchEnd)
      target.removeEventListener('touchcancel', handleTouchEnd)
      target.removeEventListener('gesturestart', preventGesture)
      target.removeEventListener('gesturechange', preventGesture)
      pinchStartRef.current = null
    }
  }, [targetRef, enabled])

  return { zoom, resetZoom }
}
