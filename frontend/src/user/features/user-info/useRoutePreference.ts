import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  isCardReady: null,
  preparationTask: null,
  hasCash: null,
}

const INITIAL_TRAIL: Trail[] = [{ node: FIRST_NODE, patch: {} }]

/**
 * 답을 고른 뒤 다음 질문으로 넘어가기까지의 지연.
 *
 * 바로 넘기면 선택 하이라이트가 보이기도 전에 화면이 바뀌어 "눌렸는지"를
 * 확인할 수 없다. 짧게 멈춰 선택된 상태를 보여주고 넘어간다.
 */
const ADVANCE_DELAY_MS = 350

/**
 * '경로에 필요한 정보' 질문 흐름의 상태.
 *
 * 서버 데이터가 아니라 사용자의 선택이므로 컴포넌트 지역 상태로 둔다.
 * (경로 상세 화면까지 값을 넘겨야 하면 그때 zustand로 올린다)
 */
export function useRoutePreference() {
  const [trail, setTrail] = useState<Trail[]>(INITIAL_TRAIL)

  /*
    질문별로 마지막에 고른 답. **표시 전용**이다.

    되돌아가면 trail 에서 답(patch)이 빠지므로 answers 만으로는 "아까 뭘
    골랐는지"를 다시 보여줄 수 없다. 그렇다고 trail 에 남기면 버려진 가지의
    답이 요청 본문에 실린다. 그래서 하이라이트 용도로만 따로 기억한다.
  */
  const [recalledAnswers, setRecalledAnswers] =
    useState<RoutePreference>(EMPTY_ANSWERS)

  /** 지연 전환 타이머. 지연 중 되돌아가기·초기화가 오면 취소해야 한다. */
  const advanceTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(advanceTimerRef.current), [])

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
    // 하이라이트는 즉시, 화면 전환은 잠깐 뒤에. 지연 중 다른 답을 고르면
    // 이전 예약을 취소하고 마지막 선택만 반영한다.
    setRecalledAnswers((prev) => ({ ...prev, ...choice.patch }))
    window.clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = window.setTimeout(() => {
      setTrail((prev) => [...prev, { node: choice.next, patch: choice.patch }])
    }, ADVANCE_DELAY_MS)
  }, [])

  const goBack = useCallback(() => {
    window.clearTimeout(advanceTimerRef.current)
    setTrail((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const reset = useCallback(() => {
    window.clearTimeout(advanceTimerRef.current)
    setRecalledAnswers(EMPTY_ANSWERS)
    setTrail(INITIAL_TRAIL)
  }, [])

  // 결과 카드에서는 마지막 점을 채워 "끝났다"는 신호를 준다.
  const activeIndex =
    node.kind === 'result'
      ? PREFERENCE_STEP_ORDER.length - 1
      : PREFERENCE_STEP_ORDER.indexOf(node.step)

  return {
    node,
    answers,
    /** 질문별로 마지막에 고른 답. 되돌아갔을 때 하이라이트 표시에만 쓴다. */
    recalledAnswers,
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
