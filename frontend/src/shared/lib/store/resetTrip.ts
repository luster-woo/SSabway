import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import { useGuideStepStore } from '@/shared/lib/store/useGuideStepStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import { useStationNodeStore } from '@/shared/lib/store/useStationNodeStore'

/**
 * 새 여정을 시작할 때 이전 여정의 선택을 비운다.
 *
 * 여정 스토어들은 sessionStorage 에 남는다 — 새로고침·백그라운드 복귀로 값이
 * 사라지지 않게 하려는 의도였는데, 그 때문에 **표지판을 다시 찍어 새 여정을
 * 시작해도 지난번 목적지가 그대로 남아 있었다.** 출발지만 새 인식 결과로 바뀌고
 * 목적지·선택 경로는 옛것이라, 지도 화면이 "대구역 → (지난번 목적지)"를 이미
 * 정해진 구간인 양 보여준다.
 *
 * 비우는 것
 *   destination    사용자가 고른 목적지
 *   selectedRoute  그 목적지로 계산해 고른 지하철 경로 (목적지가 없으면 무의미)
 *   finalPoint     경로 선택이 정한 역 내 도착 노드 (같은 이유)
 *   guideStep      상세 안내에서 보고 있던 단계 (지난 여정의 진행 상태)
 *
 * 비우지 않는 것
 *   startPoint     새 인식 결과로 곧 덮인다
 *   originStation  새 인식 결과로 곧 덮인다
 *   routePreference·언어 등 사용자 설정 — 여정과 무관하다
 *
 * ⚠️ "출발지만 바꾸는" 흐름에서는 부르면 안 된다. 안내 정보 화면의 [변경]과
 *    상세 경로 안내의 [재탐색]은 목적지를 그대로 둔 채 현재 위치만 다시 잡는
 *    동작이라, 여기서 목적지를 지우면 사용자가 처음부터 다시 골라야 한다.
 *    (호출부: SignCapturePage — returnTo 가 없는 경우에만)
 */
export function resetTripSelection() {
  useDestinationStore.getState().clearDestination()
  useSelectedRouteStore.getState().clearSelectedRoute()
  useStationNodeStore.getState().setFinalPoint(null)
  useGuideStepStore.getState().clearGuideStep()
}
