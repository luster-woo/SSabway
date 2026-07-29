import { useCallback, useMemo, useState } from 'react'

import {
  PREFERENCE_STEP_ORDER,
  type RoutePreference,
} from '@/shared/types/guide'
import {
  FIRST_NODE,
  type PreferenceChoice,
  type PreferenceNode,
} from '@/user/features/user-info/lib/preferenceFlow'

/**
 * 지나온 화면 한 칸. 답(patch)을 화면과 함께 들고 있어야
 * '이전 질문'으로 되돌아갔을 때 버려진 가지의 답도 같이 사라진다.
 */
interface Trail {
  node: PreferenceNode
  patch: Partial<RoutePreference>
}

const EMPTY_ANSWERS: RoutePreference = {
  useElevator: null,
  hasTransitCard: null,
  ticketMethod: null,
  hasCash: null,
}

const INITIAL_TRAIL: Trail[] = [{ node: FIRST_NODE, patch: {} }]

/**
 * '경로에 필요한 정보' 질문 흐름의 상태.
 *
 * 서버 데이터가 아니라 사용자의 선택이므로 컴포넌트 지역 상태로 둔다.
 * (경로 상세 화면까지 값을 넘겨야 하면 그때 zustand로 올린다)
 */
export function useRoutePreference() {
  const [trail, setTrail] = useState<Trail[]>(INITIAL_TRAIL)

  const current = trail[trail.length - 1]
  const node = current.node

  const answers = useMemo(
    () =>
      trail.reduce<RoutePreference>(
        (acc, entry) => ({ ...acc, ...entry.patch }),
        EMPTY_ANSWERS,
      ),
    [trail],
  )

  const select = useCallback((choice: PreferenceChoice) => {
    setTrail((prev) => [...prev, { node: choice.next, patch: choice.patch }])
  }, [])

  const goBack = useCallback(() => {
    setTrail((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const reset = useCallback(() => setTrail(INITIAL_TRAIL), [])

  // 결과 카드에서는 마지막 점을 채워 "끝났다"는 신호를 준다.
  const activeIndex =
    node.kind === 'result'
      ? PREFERENCE_STEP_ORDER.length - 1
      : PREFERENCE_STEP_ORDER.indexOf(node.step)

  return {
    node,
    answers,
    /** 모든 질문에 답해 계획이 확정됐으면 그 값, 아니면 null */
    plan: node.kind === 'result' ? node.plan : null,
    canGoBack: trail.length > 1,
    activeIndex,
    stepCount: PREFERENCE_STEP_ORDER.length,
    select,
    goBack,
    reset,
  }
}
