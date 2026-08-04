import type { RoutePreference } from '@/shared/types/guide'
import { PREPARATION_TASK } from '@/shared/types/guide'
import type {
  NavLangCode,
  NavNeeds,
  NavRouteRequest,
} from '@/shared/types/navigation'
import { NAV_PURPOSE } from '@/shared/types/navigation'

/**
 * 화면의 답변(PreparationTask)을 BE 의 needs 값으로 바꾼다.
 *
 * 두 enum 의 이름이 지금은 같지만 표를 두어 매핑한다. 문자열이 같다고
 * 캐스팅해 두면, 한쪽 이름이 바뀌었을 때 컴파일은 통과하고 런타임 400 으로만
 * 드러난다. 표로 두면 그 순간 컴파일이 깨진다.
 */
const NEEDS_BY_TASK: Record<
  (typeof PREPARATION_TASK)[keyof typeof PREPARATION_TASK],
  NavNeeds
> = {
  [PREPARATION_TASK.CHARGE]: NAV_PURPOSE.CHARGE,
  [PREPARATION_TASK.BUY_CARD]: NAV_PURPOSE.BUY_CARD,
  [PREPARATION_TASK.SINGLE_TICKET]: NAV_PURPOSE.SINGLE_TICKET,
}

export interface BuildNaviRequestParams {
  startPoint: string
  finalPoint: string
  answers: RoutePreference
  langCode: NavLangCode
}

/**
 * 질문 답변을 역 내 경로 요청 본문으로 만든다.
 *
 * 서버가 400 을 내는 조건이 몇 가지 있어서 그 규칙을 여기 한 곳에 모은다.
 *
 *   ① readyToGo 가 false 인데 needs 가 없으면 NAV_NEEDS_REQUIRED.
 *      질문 흐름상 카드가 준비되지 않았으면 반드시 PREPARATION 을 묻지만,
 *      되돌아가기 중간 상태에서 호출되면 비어 있을 수 있다. 그때는 요청을
 *      만들지 않고 null 을 돌려준다 — 400 을 받고 나서 아는 것보다 낫다.
 *
 *   ② readyToGo 가 true 면 needs·hasCash 를 아예 싣지 않는다. 서버가
 *      무시하긴 하지만(effectiveNeeds), 보내면 "바로 탈 수 있는데 충전하러
 *      간다"는 모순된 본문이 되어 로그를 읽을 때 혼란스럽다.
 *
 * @returns 보낼 수 있는 본문. 답이 모자라 만들 수 없으면 null.
 */
export function buildNaviRequest({
  startPoint,
  finalPoint,
  answers,
  langCode,
}: BuildNaviRequestParams): NavRouteRequest | null {
  // 카드 준비 여부는 필수 질문이라 답이 없으면 요청 자체가 성립하지 않는다.
  if (answers.isCardReady === null) return null

  const base = {
    startPoint,
    finalPoint,
    readyToGo: answers.isCardReady,
    // BE 기본값과 같지만 명시해 보낸다. 생략 시 동작이 바뀌면 바로 드러난다.
    useElevator: answers.useElevator ?? false,
    langCode,
  }

  if (answers.isCardReady) {
    return base
  }

  const needs = answers.preparationTask
    ? NEEDS_BY_TASK[answers.preparationTask]
    : null
  if (!needs) return null

  return {
    ...base,
    needs,
    hasCash: answers.hasCash ?? false,
  }
}
