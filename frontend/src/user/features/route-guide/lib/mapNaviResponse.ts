import { DAEGU_NODES } from '@/shared/station-map/daeguNavigation'
import { getPointFloor } from '@/shared/station-map/pointLandmark'
import {
  NAV_NODE_TYPE,
  type NavNodeType,
  type NavRouteResponse,
} from '@/shared/types/navigation'
import {
  ELEVATOR_DIRECTION,
  SIGN_DIRECTION,
  type ElevatorDirection,
  type GuideSign,
  type GuideStep,
  type RouteGuide,
} from '@/shared/types/routeGuide'

/**
 * 안내 문구가 비어 있을 때 대신 보여줄 문구를 만드는 함수의 타입.
 *
 * i18n 의 t 를 그대로 받는다. 이 모듈이 react-i18next 를 직접 import 하면
 * 순수 함수가 아니게 되어 테스트에서 i18n 초기화가 필요해진다.
 */
export type TranslateFn = (key: string) => string

/**
 * 표지판에 도착하는 구간에만 GuideSign 을 만든다.
 *
 * 판단 기준은 사진 유무가 아니라 도착 지점의 종류(arriveType)다. 사진이 없는
 * 표지판도 있는데(NavigationService.buildImageUrl 이 면을 못 정하면 null),
 * 사진으로 판단하면 그 표지판이 "표지판이 아닌 것"으로 취급돼 시설 카드가 뜬다.
 * 사진이 없으면 SignBoardCard 가 title 로 표지판을 그려 대체한다.
 *
 * 반대로 개찰구·편의점·엘리베이터에는 표지판이 없으므로 null 이다.
 */
function toSign(
  arriveType: NavNodeType,
  imageUrl: string | null,
  title: string,
): GuideSign | null {
  if (arriveType !== NAV_NODE_TYPE.SIGNAGE) return null

  return {
    photoUrl: imageUrl,
    title,
    // 아래 넷은 BE 에 없는 값이다. GuideSign 주석 참고.
    exitNumber: null,
    subtitle: '',
    lineBadge: null,
    direction: SIGN_DIRECTION.STRAIGHT,
  }
}

/** 두 노드의 층을 견줘 방향을 정한다. 층이 같거나 모르면 null. */
function directionBetween(from: string, to: string): ElevatorDirection | null {
  const fromFloor = getPointFloor(from)
  const toFloor = getPointFloor(to)
  if (fromFloor === null || toFloor === null || fromFloor === toFloor) {
    return null
  }
  return toFloor < fromFloor ? ELEVATOR_DIRECTION.DOWN : ELEVATOR_DIRECTION.UP
}

/**
 * 엘리베이터를 **타고 가는** 구간인지, 그렇다면 어느 쪽으로 가는지.
 *
 * 층은 프론트가 가진 지도 데이터에서 읽는다 — BE 응답에 층이 없다.
 *
 * ⚠️ "타고 간다"의 판단은 **양 끝이 다 엘리베이터 노드인가**로 한다(BE 의
 *    NavigationGraph.isElevatorRide 와 같은 기준). 층이 다른지로 판단하면 안
 *    된다 — 층이 갈리는 통로로 엘리베이터에 **걸어서** 닿는 엣지가 실제로 셋
 *    있어서(E021 S3_19→EV2_03, E022 S3_17→EV2_02, E034 S2_03→EV1_01), 그
 *    구간이 "타는 중"으로 잘못 잡히면 정작 찾아가야 할 엘리베이터 사진 대신
 *    오르내리는 그림이 뜬다.
 *
 * 엘리베이터 앞까지 걸어가는 구간은 null 이고, 그쪽은 지금까지처럼 실사 사진이
 * 있는 시설 카드로 안내한다 — 사용자가 찾아야 하는 것은 그 사진 속 엘리베이터다.
 *
 * 다른 역(노드 id 체계가 다르다)은 DAEGU_NODES 에 없어 null 이 되고, 사진
 * 카드로 떨어진다.
 */
function resolveElevatorDirection(
  step: NavRouteResponse['steps'][number],
): ElevatorDirection | null {
  if (step.arriveType !== NAV_NODE_TYPE.ELEVATOR) return null
  if (DAEGU_NODES[step.from]?.type !== NAV_NODE_TYPE.ELEVATOR) return null
  return directionBetween(step.from, step.to)
}

/**
 * 역 내 경로 응답을 화면용 구조로 옮긴다.
 *
 * 하는 일은 넷뿐이다.
 *   ① 단계 번호(order) 부여 — 서버는 순서만 보장하고 번호는 주지 않는다
 *   ② 안내 문구 폴백 — `text` 가 null 인 엣지가 있을 수 있다
 *   ③ 표지판 사진을 GuideSign 으로 감싸기
 *   ④ 엘리베이터를 타고 가는 구간의 오르내림 판단 — 층이 응답에 없어 지도
 *      데이터로 채운다
 *
 * 필터링·정렬은 하지 않는다. steps 의 순서가 곧 이동 순서이고, 중간 단계를
 * 빼면 사용자가 길을 잃는다.
 *
 * ⚠️ edgeId 는 중복될 수 있어(왕복 구간) key 로 쓰면 안 된다. order 를 쓴다.
 */
export function mapNaviResponse(
  response: NavRouteResponse,
  t: TranslateFn,
): RouteGuide {
  const steps: GuideStep[] = response.steps.map((step, index) => {
    const instruction = step.text ?? t('routeGuide.stepFallback')

    return {
      order: index + 1,
      instruction,
      sign: toSign(step.arriveType, step.imageUrl, instruction),
      // BE 응답에 도면 좌표가 없다. GuidePoint 주석 참고.
      point: null,
      // 표지판이 아닌 지점의 사진(게이트·ATM·매표소·발매기). toSign 이 null 을
      // 돌려준 구간에서만 ArrivalPointCard 가 이 값을 쓴다.
      facilityImageUrl:
        step.arriveType === NAV_NODE_TYPE.SIGNAGE ? null : step.imageUrl,
      elevatorDirection: resolveElevatorDirection(step),

      edgeId: step.edgeId,
      from: step.from,
      to: step.to,
      arriveType: step.arriveType,
      arriveCategory: step.arriveCategory,
      arrivedFor: step.arrivedFor,
    }
  })

  return {
    totalDistanceM: response.totalDistanceM,
    waypoints: response.waypoints,
    steps,
  }
}

/** 마지막 구간이 개찰구에 닿는지. 도착 안내 문구를 가르는 데 쓴다. */
export function endsAtGate(guide: RouteGuide): boolean {
  const last = guide.steps[guide.steps.length - 1]
  return last?.arriveType === NAV_NODE_TYPE.GATE
}
