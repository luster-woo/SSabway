import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react'

import { cn } from '@/shared/lib/cn'
import { StationMap } from '@/admin/features/consultation-room/StationMap'
import { StationMapLegend } from '@/admin/features/consultation-room/StationMapLegend'
import {
  STATION_MAP_SIZE,
  STATION_MAP_VIEWS,
  type StationMapView,
} from '@/admin/features/consultation-room/stationMapData'
import {
  toPointOnFloor,
  useUserRoute,
} from '@/admin/features/consultation-room/useUserRoute'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface UserLocationModalProps {
  consultationId: number
  onClose: () => void
}

/**
 * 지도 상태.
 *
 * zoom 은 층 기본 배율(1배)을 기준으로 한 배수다.
 * 0.2 단위로 움직여서 버튼을 누른 만큼 눈에 보이게 한다.
 */
interface MapState {
  /** 층 기본값 대비 배율 */
  zoom: number
  cx: number
  cy: number
}

const ZOOM_STEP = 0.2
const MIN_ZOOM = 1
const MAX_ZOOM = 4

/** 소수점 누적 오차를 막기 위해 0.2 단위로 맞춘다. */
function toStepped(zoom: number): number {
  return Math.round(zoom / ZOOM_STEP) * ZOOM_STEP
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, toStepped(zoom)))
}

/** 도면 밖으로 나가지 않도록 중심을 가둔다. */
function clampCenter(value: number, half: number): number {
  if (half * 2 >= STATION_MAP_SIZE) return STATION_MAP_SIZE / 2
  return Math.min(STATION_MAP_SIZE - half, Math.max(half, value))
}

/**
 * 사용자 위치 보기.
 *
 * 사용자가 안내받는 경로를 역 내 도면에 단계 번호로 표시한다.
 * 표지판 점은 숨기고 번호와 점선만 남긴다.
 *
 * 층 탭은 경로가 지나가지 않는 층도 모두 띄운다.
 * 역무원이 사용자 위치를 찾다가 다른 층을 확인해야 할 수 있다.
 */
export function UserLocationModal({
  consultationId,
  onClose,
}: UserLocationModalProps) {
  const { data: route, isPending, isError } = useUserRoute(consultationId, true)
  const [activeViewKey, setActiveViewKey] = useState<string | null>(null)
  const [map, setMap] = useState<MapState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  /** 드래그 시작 지점. 화면 픽셀과 도면 좌표를 함께 기억한다. */
  const dragOrigin = useRef<{
    clientX: number
    clientY: number
    cx: number
    cy: number
    /** 화면 1px 이 도면 좌표 몇 칸인지 */
    unitPerPixel: number
  } | null>(null)

  const activeView =
    STATION_MAP_VIEWS.find((view) => view.key === activeViewKey) ??
    STATION_MAP_VIEWS.find((view) => view.key === route?.[0].view) ??
    STATION_MAP_VIEWS[0]

  // 경로를 받아오면 시작 지점이 있는 층으로 맞춘다.
  useEffect(() => {
    if (!route || activeViewKey !== null) return

    const startView = STATION_MAP_VIEWS.find(
      (view) => view.key === route[0].view,
    )
    if (startView) {
      setActiveViewKey(startView.key)
      setMap({ zoom: MIN_ZOOM, cx: startView.cx, cy: startView.cy })
    }
  }, [route, activeViewKey])

  const current = map ?? {
    zoom: MIN_ZOOM,
    cx: activeView.cx,
    cy: activeView.cy,
  }
  const half = activeView.half / current.zoom

  const selectView = (view: StationMapView) => {
    setActiveViewKey(view.key)
    setMap({ zoom: MIN_ZOOM, cx: view.cx, cy: view.cy })
  }

  const changeZoom = (delta: number) => {
    setMap({ ...current, zoom: clampZoom(current.zoom + delta) })
  }

  /** 휠 위로 확대, 아래로 축소 */
  const zoomByWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
  }

  /** 현재 층에 있는 첫 경로 지점으로 화면을 옮긴다. */
  const moveToRoute = () => {
    if (!route) return

    for (const step of route) {
      const point = toPointOnFloor(step, activeView.floor)
      if (point) {
        setMap({
          zoom: Math.max(current.zoom, 2),
          cx: point.x,
          cy: point.y,
        })
        return
      }
    }
  }

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // 1배에서는 도면 전체가 보이므로 움직일 곳이 없다.
    if (current.zoom <= MIN_ZOOM) return

    const { width } = event.currentTarget.getBoundingClientRect()
    dragOrigin.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      cx: current.cx,
      cy: current.cy,
      unitPerPixel: (half * 2) / width,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current
    if (!origin) return

    // 끄는 방향과 반대로 중심이 움직여야 지도가 손끝을 따라온다.
    setMap({
      zoom: current.zoom,
      cx: origin.cx - (event.clientX - origin.clientX) * origin.unitPerPixel,
      cy: origin.cy - (event.clientY - origin.clientY) * origin.unitPerPixel,
    })
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return
    dragOrigin.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const isDraggable = current.zoom > MIN_ZOOM

  return (
    <Modal title="사용자 위치" width="lg" onClose={onClose}>
      {isPending ? (
        <p className="text-ink-muted py-10 text-center text-[13px]">
          경로를 불러오는 중…
        </p>
      ) : null}

      {isError ? (
        <p role="alert" className="text-danger py-10 text-center text-[13px]">
          경로를 불러오지 못했습니다.
        </p>
      ) : null}

      {route ? (
        <>
          <div className="flex flex-wrap gap-2">
            {STATION_MAP_VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                aria-pressed={view.key === activeView.key}
                onClick={() => selectView(view)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition',
                  'focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none',
                  view.key === activeView.key
                    ? 'border-brand bg-brand text-white'
                    : 'border-line text-ink-muted bg-surface',
                )}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* 휠 확대와 드래그 이동을 위해 wrapper 에서 포인터 이벤트를 받는다. */}
          <div
            onWheel={zoomByWheel}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              'border-line relative mt-4 aspect-square overflow-hidden rounded-2xl border',
              'touch-none select-none',
              isDraggable && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
            )}
          >
            <StationMap
              floor={activeView.floor}
              cx={clampCenter(current.cx, half)}
              cy={clampCenter(current.cy, half)}
              half={half}
              route={route}
            />

            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <MapControl
                label="확대"
                disabled={current.zoom >= MAX_ZOOM}
                onClick={() => changeZoom(ZOOM_STEP)}
              >
                +
              </MapControl>
              <MapControl
                label="축소"
                disabled={current.zoom <= MIN_ZOOM}
                onClick={() => changeZoom(-ZOOM_STEP)}
              >
                −
              </MapControl>
              <MapControl label="경로 위치로 이동" onClick={moveToRoute}>
                ◎
              </MapControl>
            </div>

            <p className="text-ink bg-surface/90 border-line absolute bottom-3 left-3 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold backdrop-blur-sm">
              {current.zoom.toFixed(1)}배
            </p>
          </div>

          <div className="mt-3">
            <StationMapLegend />
          </div>
        </>
      ) : null}

      <div className="mt-6">
        <AdminButton size="lg" fullWidth onClick={onClose}>
          닫기
        </AdminButton>
      </div>
    </Modal>
  )
}

interface MapControlProps {
  label: string
  children: string
  disabled?: boolean
  onClick: () => void
}

/** 지도 위에 겹쳐 놓는 작은 조작 버튼 */
function MapControl({
  label,
  children,
  disabled = false,
  onClick,
}: MapControlProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      // 버튼을 눌렀을 때 지도 드래그가 함께 시작되지 않게 막는다.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className={cn(
        'border-line bg-surface/90 text-ink flex size-8 items-center justify-center',
        'rounded-lg border text-[15px] font-bold shadow-sm backdrop-blur-sm',
        'hover:bg-surface focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {children}
    </button>
  )
}
