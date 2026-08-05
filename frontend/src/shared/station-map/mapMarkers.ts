/**
 * 지도 마커·진행 방향 표시의 공용 값과 계산.
 *
 * 사용자 지도(StationRouteMap)와 관리자 지도(StationMap)가 "내 위치"와
 * "가야 하는 방향"을 같은 모양으로 그려야 해서 한 곳에 둔다.
 * 도면 데이터(daeguNavigation·stationMapData)를 import 하지 않으므로
 * 어느 쪽 화면에서 써도 번들에 도면이 끌려오지 않는다.
 */

/**
 * 내 위치 마커 색 (네이버 지도의 현재 위치 점과 같은 계열의 파랑).
 *
 * 경로선 색(ROUTE_COLOR·MARKER_COLOR)과 겹치지 않는 값을 쓴다 —
 * "내가 있는 곳"과 "지나갈 길"이 같은 색이면 구분되지 않기 때문이다.
 */
export const MY_LOCATION_COLOR = '#2E6BF2'

/** 내 위치 점 반지름 (도면 좌표 기준, markerScale=1 일 때) */
export const MY_LOCATION_RADIUS = 40

/** 내 위치 점을 감싸는 흰 테두리 굵기 */
export const MY_LOCATION_BORDER = 14

/** 위치 정확도를 뜻하는 옅은 원의 반지름 */
export const MY_LOCATION_HALO_RADIUS = 96

/** 내 위치 펄스 링이 퍼지는 최대 반지름 */
export const MY_LOCATION_PULSE_RADIUS = 128

/** 진행 방향 화살촉 사이 간격 */
export const DIRECTION_SPACING = 125

/** 화살촉 길이(꼭짓점에서 뒤쪽까지)와 벌어짐(꼭짓점 기준 위·아래) */
export const DIRECTION_ARROW_LENGTH = 17
export const DIRECTION_ARROW_SPREAD = 10

/** 화살촉 선 굵기 */
export const DIRECTION_ARROW_WIDTH = 8

/**
 * +x 방향을 가리키는 화살촉 하나. 원점이 꼭짓점이라
 * `translate(x y) rotate(angle)` 만으로 진행 방향에 맞춰 놓을 수 있다.
 */
export const DIRECTION_ARROW_PATH = `M ${String(-DIRECTION_ARROW_LENGTH)} ${String(-DIRECTION_ARROW_SPREAD)} L 0 0 L ${String(-DIRECTION_ARROW_LENGTH)} ${String(DIRECTION_ARROW_SPREAD)}`

/** 흐르는 애니메이션 한 바퀴 길이(초)와 한 바퀴에 들어가는 화살촉 수 */
export const DIRECTION_FLOW_DURATION = 1.6
export const DIRECTION_FLOW_STEPS = 4

/**
 * 화살촉 하나의 애니메이션 지연. 경로 앞쪽 화살촉이 먼저 밝아지도록
 * 순번이 뒤일수록 더 음수인 값을 준다 — 빛이 진행 방향으로 흐른다.
 */
export function toDirectionFlowDelay(order: number): string {
  const step = DIRECTION_FLOW_DURATION / DIRECTION_FLOW_STEPS
  return `${String(-(order % DIRECTION_FLOW_STEPS) * step)}s`
}

export interface MarkerPoint {
  x: number
  y: number
}

export interface DirectionMark extends MarkerPoint {
  /** 진행 방향 (도, SVG rotate 에 그대로 넣는다) */
  angle: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 경로선 위에 진행 방향 화살촉을 놓을 지점들을 구한다.
 *
 * 선을 따라 실제 길이(꺾인 구간 포함)를 재고 `spacing` 에 가장 가까운
 * 균등 간격으로 배치한다. 간격을 딱 spacing 으로 고정하지 않는 이유는
 * 짧은 구간에서 화살촉이 한쪽에 몰려 방향이 애매해지기 때문이다.
 *
 * `startGap`·`endGap` 은 양 끝에서 비워 둘 길이다 — 내 위치 마커나
 * 다음 위치 마커에 화살촉이 겹쳐 가려지는 것을 막는다.
 * 비워 둘 길이가 선보다 길면 화살촉을 그리지 않는다(빈 배열).
 *
 * 좌표 단위 값이라 확대·축소하는 지도에서는 spacing·gap 에도 마커와 같은
 * 배율(markerScale)을 곱해 넘겨야 화면상 간격이 일정하다.
 */
export function toDirectionMarks(
  path: readonly MarkerPoint[] | null | undefined,
  spacing: number,
  startGap = 0,
  endGap = startGap,
): DirectionMark[] {
  if (!path || path.length < 2 || spacing <= 0) return []

  const lengths: number[] = []
  let total = 0
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    lengths.push(length)
    total += length
  }

  const usable = total - startGap - endGap
  if (usable <= 0) return []

  const count = Math.max(Math.floor(usable / spacing), 1)
  const step = usable / count

  const marks: DirectionMark[] = []
  /** 지금 보고 있는 세그먼트와, 그 앞 세그먼트들의 길이 합 */
  let segment = 0
  let passed = 0

  for (let index = 0; index < count; index += 1) {
    // 균등 간격의 중앙에 놓는다 — 양 끝 여백이 같아진다.
    const target = startGap + step * (index + 0.5)

    while (segment < lengths.length - 1 && passed + lengths[segment] < target) {
      passed += lengths[segment]
      segment += 1
    }

    const from = path[segment]
    const to = path[segment + 1]
    const length = lengths[segment]
    const ratio = length > 0 ? clamp((target - passed) / length, 0, 1) : 0

    marks.push({
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
    })
  }

  return marks
}
