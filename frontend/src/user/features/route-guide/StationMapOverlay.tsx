import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { MARKER_COLOR, StationMap } from '@/shared/station-map/StationMap'
import {
  STATION_MAP_SIZE,
  STATION_MAP_VIEWS,
  type StationMapView,
} from '@/shared/station-map/stationMapData'
import {
  PROTOTYPE_STATION_ROUTE,
  type UserRouteStep,
} from '@/shared/station-map/stationRoute'
import type { GuideStep } from '@/shared/types/routeGuide'

export interface StationMapOverlayProps {
  /** 경로 상세 안내 응답의 단계들. point(도면 좌표)가 지도의 데이터 소스다. */
  steps: readonly GuideStep[]
  /** 경로 상세 안내에서 보고 있던 단계 인덱스 (0부터) */
  currentIndex: number
  onClose: () => void
}

/** 지도의 보이는 영역. StationMap 의 viewBox 로 그대로 들어간다. */
interface Viewport {
  cx: number
  cy: number
  half: number
}

/** 최대 확대 = 도면 좌표 기준 반경 150 (뷰 기본 반경의 약 1/7) */
const MIN_HALF = 150

/** ± 버튼 한 번의 배율. 프로토타입의 0.2 스텝과 비슷한 체감이다. */
const BUTTON_ZOOM_FACTOR = 1.25

/** 휠 한 칸의 배율. 버튼보다 잘게 움직여야 데스크톱에서 조절감이 난다. */
const WHEEL_ZOOM_FACTOR = 1.1

/** 더블탭·더블클릭 한 번의 확대 배율 */
const DOUBLE_TAP_ZOOM_FACTOR = 1.6

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 확대·이동 결과가 도면 밖이나 과도한 줌으로 벗어나지 않게 고정한다. */
function clampViewport(viewport: Viewport, maxHalf: number): Viewport {
  const half = clamp(viewport.half, MIN_HALF, maxHalf)
  return {
    half,
    cx: clamp(viewport.cx, half, STATION_MAP_SIZE - half),
    cy: clamp(viewport.cy, half, STATION_MAP_SIZE - half),
  }
}

function toViewport(view: StationMapView): Viewport {
  return { cx: view.cx, cy: view.cy, half: view.half }
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 컨테이너 픽셀 → viewBox 안에서의 위치 비율(0~1).
 *
 * viewBox 는 정사각형이고 preserveAspectRatio 기본값(meet)이라, 도면은
 * 컨테이너의 짧은 변에 맞춰 가운데 정렬된다. 따라서 짧은 변 길이와
 * 레터박스 여백만 알면 배율과 무관하게 비율을 구할 수 있다.
 */
function toAnchorFraction(
  container: HTMLElement,
  pxX: number,
  pxY: number,
): { fx: number; fy: number } {
  const width = container.clientWidth
  const height = container.clientHeight
  const side = Math.max(Math.min(width, height), 1)

  return {
    fx: (pxX - (width - side) / 2) / side,
    fy: (pxY - (height - side) / 2) / side,
  }
}

/**
 * 고정점(fx, fy) 아래의 도면 지점이 화면에서 움직이지 않도록 배율을 바꾼다.
 * 휠은 커서, 핀치는 두 손가락의 중점, 더블탭은 탭 지점을 고정점으로 쓴다.
 */
function zoomViewportAt(
  prev: Viewport,
  factor: number,
  fx: number,
  fy: number,
  maxHalf: number,
): Viewport {
  const half = clamp(prev.half * factor, MIN_HALF, maxHalf)
  if (half === prev.half) return prev

  // 고정점 아래의 도면 좌표
  const mapX = prev.cx - prev.half + fx * 2 * prev.half
  const mapY = prev.cy - prev.half + fy * 2 * prev.half

  // 새 배율에서도 같은 화면 위치에 같은 도면 좌표가 오도록 중심을 역산한다
  return clampViewport(
    {
      half,
      cx: mapX - half * (2 * fx - 1),
      cy: mapY - half * (2 * fy - 1),
    },
    maxHalf,
  )
}

/**
 * '역 내에서 현재 위치 보기' 전체 화면 오버레이. (프로토타입 6페이지 지도)
 *
 * 관리자 화상 화면과 같은 도면·경로(shared/station-map)를 쓴다 — 상담 중
 * 역무원이 보는 지도와 사용자가 보는 지도가 어긋나면 안 되기 때문이다.
 *
 * 현재 위치 = 보고 있던 안내 단계의 표지판 위치다. GPS 가 아니라 "마지막으로
 * 인식·확인한 표지판"이 위치의 근거라서, 단계와 위치는 항상 함께 움직인다.
 *
 * 조작: 층 탭 전환 · 한 손가락 드래그 이동 · 두 손가락 핀치 줌 · ± 버튼.
 * 좌표 포함 경로 응답이 생기기 전까지 경로는 PROTOTYPE_STATION_ROUTE 를 쓴다.
 */
export function StationMapOverlay({
  steps,
  currentIndex,
  onClose,
}: StationMapOverlayProps) {
  const { t } = useTranslation()

  /*
    안내 응답의 point(도면 좌표)로 지도 경로를 만든다.

    좌표는 명세 제안 필드라 BE 가 아직 안 줄 수 있다(point: null).
    - 좌표가 하나도 없으면: 프로토타입 경로로 대체해 지도는 계속 보여준다.
    - 일부만 없으면: 있는 단계만 찍는다. 그래서 안내 단계 인덱스와 지도
      마커 인덱스가 어긋날 수 있어 guideIndex 를 함께 들고 다닌다.
  */
  const positions = useMemo(
    () =>
      steps.flatMap((step, guideIndex) => {
        const point = step.point
        if (!point) return []

        const routeStep: UserRouteStep = {
          id: `guide-${String(step.order)}`,
          floor: point.floor,
          view: point.view,
          x: point.x,
          y: point.y,
          name: step.instruction,
          sign: step.sign.title,
          up: point.up,
        }
        return [{ guideIndex, routeStep }]
      }),
    [steps],
  )

  const hasPoints = positions.length > 0
  const route: readonly UserRouteStep[] = hasPoints
    ? positions.map((position) => position.routeStep)
    : PROTOTYPE_STATION_ROUTE

  // 현재 위치 = 좌표가 있는 단계 중, 보고 있던 단계를 넘지 않는 마지막 단계
  const clampedGuideIndex = clamp(currentIndex, 0, Math.max(steps.length - 1, 0))
  let clampedIndex = 0
  if (hasPoints) {
    for (let index = 0; index < positions.length; index += 1) {
      if (positions[index].guideIndex <= clampedGuideIndex) clampedIndex = index
    }
  } else {
    clampedIndex = clamp(currentIndex, 0, route.length - 1)
  }
  const currentStep = route[clampedIndex]

  // 처음 열 때는 현재 단계가 있는 층(뷰)을 보여준다
  const [activeView, setActiveView] = useState<StationMapView>(
    () =>
      STATION_MAP_VIEWS.find((view) => view.key === currentStep.view) ??
      STATION_MAP_VIEWS[0],
  )
  const [viewport, setViewport] = useState<Viewport>(() =>
    toViewport(activeView),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  /** 눌려 있는 포인터들의 마지막 위치. 드래그·핀치 판정의 근거다. */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  /** 핀치 시작 시점의 두 손가락 거리와 반경. 제스처 동안의 기준값이다. */
  const pinchRef = useRef<{ distance: number; half: number } | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  /*
    데스크톱 휠 줌 — 커서 아래 지점을 고정한 채 확대·축소한다.
    React 의 onWheel 은 passive 로 붙어 preventDefault(페이지 스크롤 차단)가
    안 먹히므로 네이티브 리스너로 직접 단다.
  */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const maxHalf = activeView.half

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      const rect = container.getBoundingClientRect()
      const { fx, fy } = toAnchorFraction(
        container,
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
      const factor =
        event.deltaY > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR

      setViewport((prev) => zoomViewportAt(prev, factor, fx, fy, maxHalf))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [activeView.half])

  const selectView = (view: StationMapView) => {
    setActiveView(view)
    setViewport(toViewport(view))
    pinchRef.current = null
  }

  /** 프로토타입처럼 화면 중심을 고정한 채 배율만 바꾼다. */
  const zoomBy = (factor: number) => {
    setViewport((prev) =>
      clampViewport({ ...prev, half: prev.half * factor }, activeView.half),
    )
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      pinchRef.current = {
        distance: distanceBetween(first, second),
        half: viewport.half,
      }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId)
    if (!previous) return

    const point = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, point)

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    // 두 손가락 — 핀치 줌. 두 손가락의 중점을 고정점으로 삼는다.
    if (pointersRef.current.size >= 2) {
      const pinch = pinchRef.current
      if (!pinch) return

      const [first, second] = [...pointersRef.current.values()]
      const targetHalf =
        pinch.half * (pinch.distance / Math.max(distanceBetween(first, second), 1))

      const { fx, fy } = toAnchorFraction(
        container,
        (first.x + second.x) / 2 - rect.left,
        (first.y + second.y) / 2 - rect.top,
      )

      setViewport((prev) =>
        zoomViewportAt(
          prev,
          targetHalf / prev.half,
          fx,
          fy,
          activeView.half,
        ),
      )
      return
    }

    // 한 손가락(마우스 드래그 포함) — 이동.
    // 도면은 짧은 변 기준으로 그려지므로 짧은 변으로 환산해야 손과 지도가 같이 움직인다.
    setViewport((prev) => {
      const side = Math.max(
        Math.min(container.clientWidth, container.clientHeight),
        1,
      )
      const unitsPerPixel = (prev.half * 2) / side
      return clampViewport(
        {
          ...prev,
          cx: prev.cx - (point.x - previous.x) * unitsPerPixel,
          cy: prev.cy - (point.y - previous.y) * unitsPerPixel,
        },
        activeView.half,
      )
    })
  }

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }

  /** 더블클릭·더블탭 — 그 지점을 고정한 채 한 단계 확대 */
  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const { fx, fy } = toAnchorFraction(
      container,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )

    setViewport((prev) =>
      zoomViewportAt(
        prev,
        1 / DOUBLE_TAP_ZOOM_FACTOR,
        fx,
        fy,
        activeView.half,
      ),
    )
  }

  const legendItems = [
    { key: 'current', color: MARKER_COLOR.current },
    { key: 'prev', color: MARKER_COLOR.passed },
    { key: 'next', color: MARKER_COLOR.upcoming },
  ] as const

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('routeGuide.stationMap.title')}
      className="fixed inset-0 z-50 bg-black/45"
    >
      <div className="bg-surface mx-auto flex h-full w-full max-w-[520px] flex-col">
        {/* 헤더 */}
        <div className="pt-safe px-4">
          <div className="flex items-center justify-between py-3">
            <h2 className="text-ink text-[16px] font-bold">
              {t('routeGuide.stationMap.title')}
            </h2>
            <button
              type="button"
              aria-label={t('routeGuide.stationMap.close')}
              onClick={onClose}
              className="text-ink-muted flex size-9 items-center justify-center rounded-full active:brightness-90"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {/* 층(뷰) 탭 */}
          <div
            role="tablist"
            aria-label={t('routeGuide.stationMap.title')}
            className="flex gap-1.5 pb-3"
          >
            {STATION_MAP_VIEWS.map((view) => {
              const isActive = view.key === activeView.key
              return (
                <button
                  key={view.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectView(view)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition',
                    isActive
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-surface text-ink-muted',
                  )}
                >
                  {t(`routeGuide.stationMap.views.${view.key}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* 지도 */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releasePointer}
          onPointerCancel={releasePointer}
          onDoubleClick={handleDoubleClick}
          className="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
        >
          <StationMap
            floor={activeView.floor}
            cx={viewport.cx}
            cy={viewport.cy}
            half={viewport.half}
            route={route}
            currentIndex={clampedIndex}
            /*
              확대해도 마커의 화면 크기가 (거의) 일정하도록 뷰포트에 비례해
              역보정한다. 최소 0.35 — 그 밑으로 줄이면 번호가 안 읽힌다.
            */
            markerScale={clamp(viewport.half / activeView.half, 0.35, 1)}
          />

          {/* 줌 버튼 */}
          <div className="absolute right-3 bottom-3 flex flex-col gap-2">
            <button
              type="button"
              aria-label={t('routeGuide.stationMap.zoomIn')}
              onClick={() => zoomBy(1 / BUTTON_ZOOM_FACTOR)}
              className="border-line bg-surface text-ink flex size-10 items-center justify-center rounded-xl border text-[20px] font-bold shadow-sm active:brightness-95"
            >
              +
            </button>
            <button
              type="button"
              aria-label={t('routeGuide.stationMap.zoomOut')}
              onClick={() => zoomBy(BUTTON_ZOOM_FACTOR)}
              className="border-line bg-surface text-ink flex size-10 items-center justify-center rounded-xl border text-[20px] font-bold shadow-sm active:brightness-95"
            >
              −
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="pb-safe border-line border-t px-4">
          <ul className="flex items-center gap-4 py-3">
            {legendItems.map((item) => (
              <li
                key={item.key}
                className="text-ink-muted flex items-center gap-1.5 text-[12px] font-semibold"
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {t(`routeGuide.stationMap.legend.${item.key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
