import {
  NAV_NODE_TYPE,
  type NavNodeType,
  type NavRouteResponse,
} from '@/shared/types/navigation'
import {
  SIGN_DIRECTION,
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

/**
 * 역 내 경로 응답을 화면용 구조로 옮긴다.
 *
 * 하는 일은 셋뿐이다.
 *   ① 단계 번호(order) 부여 — 서버는 순서만 보장하고 번호는 주지 않는다
 *   ② 안내 문구 폴백 — `text` 가 null 인 엣지가 있을 수 있다
 *   ③ 표지판 사진을 GuideSign 으로 감싸기
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
      facilityImageUrl: step.arriveType === NAV_NODE_TYPE.SIGNAGE ? null : step.imageUrl,

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
