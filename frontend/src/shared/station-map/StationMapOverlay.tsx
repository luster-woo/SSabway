import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import type { Language } from '@/shared/types/user'

import {
  DAEGU_MAP_HEIGHT,
  DAEGU_MAP_WIDTH,
} from '@/shared/station-map/daeguMap'
import { StationRouteMap } from '@/shared/station-map/StationRouteMap'
import { MY_LOCATION_COLOR } from '@/shared/station-map/mapMarkers'
import {
  ROUTE_COLOR,
  toRouteBounds,
  toStepPath,
  type RouteStepRef,
} from '@/shared/station-map/routePath'

/**
 * 지도를 그리지 못하는 동안 지도 자리에 대신 보여줄 상태.
 *
 * 사용자 화면은 경로가 준비된 뒤에만 오버레이를 열기 때문에 쓰지 않는다.
 * 관리자 화면은 [사용자 위치 보기] 를 누른 뒤에 경로를 조회하므로
 * 조회 중·실패를 이 오버레이 안에서 보여줘야 한다 — 지도만 없고 껍데기는
 * 사용자 화면과 같아야 "같은 화면을 보고 있다"는 감각이 유지된다.
 */
export interface StationMapStatus {
  kind: 'loading' | 'error'
  message: string
}

export interface StationMapOverlayProps {
  /**
   * 경로 단계들. edgeId·from·to 가 지도의 데이터 소스다.
   *
   * 사용자는 경로 상세 안내 응답(GuideStep)을, 관리자는 상담별 경로 조회
   * 응답을 그대로 넘긴다 — 둘 다 이 세 필드를 갖는다.
   */
  steps: readonly RouteStepRef[]
  /** 사용자가 보고 있는 단계 인덱스 (0부터) */
  currentIndex: number
  /** 값이 있으면 지도 대신 이 상태를 보여준다 */
  status?: StationMapStatus
  /**
   * 문구를 이 언어로 고정한다. 없으면 앱의 현재 언어를 따른다.
   *
   * 관리자 화면은 한국어 고정이라 'ko' 를 넘긴다. 앱 기본 언어가 영어라
   * (DEFAULT_LANGUAGE) 이걸 넘기지 않으면 역무원 화면에서 한국어 안내문
   * 옆에 영어 헤더가 붙는다.
   */
  lang?: Language
  onClose: () => void
}

/** 지도의 보이는 영역. StationRouteMap 의 viewBox 로 그대로 들어간다. */
interface Viewport {
  cx: number
  cy: number
  half: number
}

/** 최대 축소 = 도면 전체가 들어오는 반경 (긴 변 기준) */
const MAX_HALF = Math.max(DAEGU_MAP_WIDTH, DAEGU_MAP_HEIGHT) / 2

/** 최대 확대 = 도면 좌표 기준 반경 250 (약 20m 폭) */
const MIN_HALF = 250

/**
 * 마커가 화면에서 알맞게 보이는 기준 반경. markerScale = half / 이 값이라
 * 확대·축소해도 마커·선의 화면 크기가 일정하다.
 */
const MARKER_REFERENCE_HALF = 900

/** 처음 열 때 현재 구간 주변을 보여줄 최소 반경 */
const INITIAL_MIN_HALF = 500

/** ± 버튼 한 번의 배율. 프로토타입의 0.2 스텝과 비슷한 체감이다. */
const BUTTON_ZOOM_FACTOR = 1.25

/** 휠 한 칸의 배율. 버튼보다 잘게 움직여야 데스크톱에서 조절감이 난다. */
const WHEEL_ZOOM_FACTOR = 1.1

/** 더블탭·더블클릭 한 번의 확대 배율 */
const DOUBLE_TAP_ZOOM_FACTOR = 1.6

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 한 축의 중심 좌표를 도면 안으로 고정한다. 뷰가 도면보다 크면 가운데 둔다. */
function clampCenter(value: number, half: number, size: number): number {
  if (half * 2 >= size) return size / 2
  return clamp(value, half, size - half)
}

/** 확대·이동 결과가 도면 밖이나 과도한 줌으로 벗어나지 않게 고정한다. */
function clampViewport(viewport: Viewport): Viewport {
  const half = clamp(viewport.half, MIN_HALF, MAX_HALF)
  return {
    half,
    cx: clampCenter(viewport.cx, half, DAEGU_MAP_WIDTH),
    cy: clampCenter(viewport.cy, half, DAEGU_MAP_HEIGHT),
  }
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
): Viewport {
  const half = clamp(prev.half * factor, MIN_HALF, MAX_HALF)
  if (half === prev.half) return prev

  // 고정점 아래의 도면 좌표
  const mapX = prev.cx - prev.half + fx * 2 * prev.half
  const mapY = prev.cy - prev.half + fy * 2 * prev.half

  // 새 배율에서도 같은 화면 위치에 같은 도면 좌표가 오도록 중심을 역산한다
  return clampViewport({
    half,
    cx: mapX - half * (2 * fx - 1),
    cy: mapY - half * (2 * fy - 1),
  })
}

/**
 * 처음 열 때의 뷰 — 현재 구간(현재 위치 → 다음 위치)이 여유 있게 들어오는 뷰.
 * 현재 구간을 모르면 전체 경로를, 그것도 없으면 도면 전체를 보여준다.
 */
function toInitialViewport(
  steps: readonly RouteStepRef[],
  currentIndex: number,
): Viewport {
  const currentPath = steps[currentIndex]
    ? toStepPath(steps[currentIndex])
    : null
  const bounds = currentPath
    ? toRouteBounds([currentPath])
    : toRouteBounds(steps.map(toStepPath))

  if (!bounds) {
    return clampViewport({
      cx: DAEGU_MAP_WIDTH / 2,
      cy: DAEGU_MAP_HEIGHT / 2,
      half: MAX_HALF,
    })
  }

  // 구간 주변 맥락(주변 시설·통로)이 보이도록 1.6배 여유를 준다.
  const half = Math.max(
    ((Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2) *
      16) /
      10,
    INITIAL_MIN_HALF,
  )

  return clampViewport({
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
    half,
  })
}

/**
 * '역 내에서 현재 위치 보기' 전체 화면 오버레이. (사용자·관리자 공용)
 *
 * 사용자 앱의 경로 상세 안내와 관리자 화상 상담의 [사용자 위치 보기] 가
 * **같은 화면**을 띄운다 — 역무원이 사용자와 통화하면서 "지금 파란 점이 있는
 * 곳"을 말로 짚어야 하므로, 두 화면이 조금이라도 다르면 대화가 어긋난다.
 * 그래서 user 레이어가 아니라 shared 에 둔다 (8/5 승격).
 *
 * 배경은 daegu_map.svg 한 장이다 — 모든 층이 한 화면에 그려진 지도라 층 탭
 * 없이 그대로 쓴다(팀 결정 8/4). 경로는 응답 steps 의 edgeId 를 도면
 * 그래프(daeguNavigation)와 맞춰 그린다.
 *
 * 현재 위치 = 보고 있던 안내 단계의 from 노드다. GPS 가 아니라 "마지막으로
 * 인식·확인한 표지판"이 위치의 근거라서, 단계와 위치는 항상 함께 움직인다.
 *
 * 조작: 한 손가락 드래그 이동 · 두 손가락 핀치 줌 · 휠 줌 · 더블탭 · ± 버튼.
 *
 * 문구는 `routeGuide.stationMap.*` 키를 쓴다 — 관리자 화면에서도 같은 키를
 * 쓰는 편이 번역을 두 벌로 나누는 것보다 어긋날 위험이 적다.
 * (관리자는 `lang="ko"` 로 한국어로 고정해서 쓴다)
 */
export function StationMapOverlay({
  steps,
  currentIndex,
  status,
  lang,
  onClose,
}: StationMapOverlayProps) {
  // lng 를 주면 그 언어로 고정되고, undefined 면 현재 언어를 따른다.
  const { t } = useTranslation(undefined, { lng: lang })

  const clampedIndex = clamp(currentIndex, 0, Math.max(steps.length - 1, 0))

  /** 경로를 받은 뒤의 기본 뷰 — 현재 구간이 화면에 들어오는 시점. */
  const defaultViewport = useMemo(
    () => toInitialViewport(steps, clampedIndex),
    [steps, clampedIndex],
  )

  /**
   * 사용자가 직접 옮긴 뷰. null 이면 아직 손대지 않았다는 뜻이고 기본 뷰를 쓴다.
   *
   * 기본 뷰를 useState 초기값으로 한 번만 계산하면 안 된다 — 관리자 화면은
   * 경로를 조회하는 동안에도 이 컴포넌트가 떠 있어서(status) 마운트 시점의
   * steps 가 빈 배열이다. 그때 계산한 "도면 전체" 뷰를 붙잡아 두면 경로가
   * 도착해도 확대되지 않은 채로 남는다.
   */
  const [movedViewport, setMovedViewport] = useState<Viewport | null>(null)
  const viewport = movedViewport ?? defaultViewport

  /** 뷰를 옮긴다. 아직 손대지 않았으면 기본 뷰에서 출발한다. */
  const moveViewport = (next: (prev: Viewport) => Viewport) => {
    setMovedViewport((prev) => next(prev ?? defaultViewport))
  }

  /** 현재 구간으로 시점을 되돌린다. 지도를 헤매다 눌러 복귀하는 용도. */
  const recenter = () => {
    setMovedViewport(null)
  }

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

    deps 에 defaultViewport 를 둔다: 아직 한 번도 옮기지 않은 상태에서 휠을
    굴리면 기본 뷰에서 출발해야 하는데, 빈 deps 로 두면 첫 렌더의 기본 뷰
    (관리자 화면에서는 경로가 없던 "도면 전체")를 계속 붙잡는다.
    defaultViewport 는 steps·현재 단계가 바뀔 때만 새로 만들어지므로
    확대·이동 중에 리스너가 다시 붙지는 않는다.
  */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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

      setMovedViewport((prev) =>
        zoomViewportAt(prev ?? defaultViewport, factor, fx, fy),
      )
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [defaultViewport])

  /** 프로토타입처럼 화면 중심을 고정한 채 배율만 바꾼다. */
  const zoomBy = (factor: number) => {
    moveViewport((prev) => clampViewport({ ...prev, half: prev.half * factor }))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    /*
      줌·복귀 버튼 위에서 시작한 포인터는 잡지 않는다.

      아래의 setPointerCapture 를 걸면 이후 pointerup 이 컨테이너로 재타깃되고,
      브라우저는 pointerdown·pointerup 의 공통 조상에서 click 을 만든다 —
      즉 버튼의 onClick 이 **아예 발생하지 않는다**. 실제로 ± 와 복귀 버튼이
      마우스·손가락으로는 눌리지 않았다(합성 click 으로만 동작). 8/5 발견.
    */
    if (event.target instanceof Element && event.target.closest('button')) {
      return
    }

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
        pinch.half *
        (pinch.distance / Math.max(distanceBetween(first, second), 1))

      const { fx, fy } = toAnchorFraction(
        container,
        (first.x + second.x) / 2 - rect.left,
        (first.y + second.y) / 2 - rect.top,
      )

      moveViewport((prev) =>
        zoomViewportAt(prev, targetHalf / prev.half, fx, fy),
      )
      return
    }

    // 한 손가락(마우스 드래그 포함) — 이동.
    // 도면은 짧은 변 기준으로 그려지므로 짧은 변으로 환산해야 손과 지도가 같이 움직인다.
    moveViewport((prev) => {
      const side = Math.max(
        Math.min(container.clientWidth, container.clientHeight),
        1,
      )
      const unitsPerPixel = (prev.half * 2) / side
      return clampViewport({
        ...prev,
        cx: prev.cx - (point.x - previous.x) * unitsPerPixel,
        cy: prev.cy - (point.y - previous.y) * unitsPerPixel,
      })
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

    moveViewport((prev) =>
      zoomViewportAt(prev, 1 / DOUBLE_TAP_ZOOM_FACTOR, fx, fy),
    )
  }

  /**
   * 범례. '내 위치'는 지도의 마커와 같은 흰 테두리 점으로 보여서
   * 경로선 색(현재 구간·남은 경로)과 다른 것이라는 걸 알 수 있게 한다.
   */
  const legendItems = [
    { key: 'myLocation', color: MY_LOCATION_COLOR, ringed: true },
    { key: 'current', color: ROUTE_COLOR.current, ringed: false },
    { key: 'upcoming', color: ROUTE_COLOR.upcoming, ringed: false },
    { key: 'passed', color: ROUTE_COLOR.passed, ringed: false },
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
        </div>

        {/* 경로를 아직 못 그리는 상태 — 껍데기는 그대로 두고 지도 자리만 바꾼다 */}
        {status ? (
          <div className="bg-surface-muted flex min-h-0 flex-1 items-center justify-center px-6">
            <p
              // 실패는 스크린리더에도 알린다. 로딩은 곧 내용이 바뀌므로 알리지 않는다.
              role={status.kind === 'error' ? 'alert' : undefined}
              className={
                status.kind === 'error'
                  ? 'text-danger text-center text-[13px]'
                  : 'text-ink-muted text-center text-[13px]'
              }
            >
              {status.message}
            </p>
          </div>
        ) : null}

        {/* 지도 */}
        {status ? null : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            onDoubleClick={handleDoubleClick}
            className="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
          >
            <StationRouteMap
              cx={viewport.cx}
              cy={viewport.cy}
              half={viewport.half}
              steps={steps}
              currentIndex={clampedIndex}
              // 확대해도 마커·선의 화면 크기가 일정하도록 뷰포트에 비례해 역보정한다.
              markerScale={viewport.half / MARKER_REFERENCE_HALF}
            />

            {/* 줌·복귀 버튼 */}
            <div className="absolute right-3 bottom-3 flex flex-col gap-2">
              <button
                type="button"
                aria-label={t('routeGuide.stationMap.recenter')}
                onClick={recenter}
                className="border-line bg-surface text-ink flex size-10 items-center justify-center rounded-xl border shadow-sm active:brightness-95"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <circle cx="10" cy="10" r="5.5" />
                  <circle cx="10" cy="10" r="1.4" fill="currentColor" />
                  <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
                </svg>
              </button>
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
        )}

        {/* 범례 — 지도가 없으면 설명할 것도 없다 */}
        {status ? null : (
          <div className="pb-safe border-line border-t px-4">
            <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 py-3">
              {legendItems.map((item) => (
                <li
                  key={item.key}
                  className="text-ink-muted flex items-center gap-1.5 text-[12px] font-semibold"
                >
                  <span
                    aria-hidden
                    className={
                      item.ringed
                        ? 'size-3.5 rounded-full ring-2 ring-white ring-inset'
                        : 'size-3 rounded-full'
                    }
                    style={{ backgroundColor: item.color }}
                  />
                  {t(`routeGuide.stationMap.legend.${item.key}`)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
