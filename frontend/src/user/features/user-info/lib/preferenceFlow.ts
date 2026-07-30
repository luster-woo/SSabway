import {
  PREFERENCE_STEP,
  ROUTE_PLAN,
  TICKET_METHOD,
  type PreferenceStep,
  type RoutePlan,
  type RoutePreference,
} from '@/shared/types/guide'

/** 카드에 지금 무엇을 그릴지 — 질문 하나이거나, 확정된 경유 계획이다. */
export type PreferenceNode =
  | { kind: 'question'; step: PreferenceStep }
  | { kind: 'result'; plan: RoutePlan }

function toQuestion(step: PreferenceStep): PreferenceNode {
  return { kind: 'question', step }
}

function toResult(plan: RoutePlan): PreferenceNode {
  return { kind: 'result', plan }
}

/** 질문에 대한 선택지 하나 */
export interface PreferenceChoice {
  /** 버튼 라벨 i18n 키 */
  labelKey: string
  /** 이 선택으로 확정되는 답 */
  patch: Partial<RoutePreference>
  /** 선택 후 보여줄 화면 */
  next: PreferenceNode
}

export interface PreferenceQuestion {
  /** 질문 문구 i18n 키 */
  questionKey: string
  choices: readonly PreferenceChoice[]
}

/**
 * 질문 분기표.
 *
 *   엘리베이터 → 교통카드 ─ 있음 → 바로 안내
 *                        └ 없음 → 이동 방식 ─ 1회권  → 발매기 경유
 *                                          └ 카드구매 → 현금 ─ 있음 → 편의점 경유
 *                                                            └ 없음 → ATM 경유
 */
export const PREFERENCE_QUESTIONS: Record<
  PreferenceStep,
  PreferenceQuestion
> = {
  [PREFERENCE_STEP.ELEVATOR]: {
    questionKey: 'userInfo.preference.elevator.question',
    choices: [
      {
        labelKey: 'userInfo.preference.elevator.yes',
        patch: { useElevator: true },
        next: toQuestion(PREFERENCE_STEP.TRANSIT_CARD),
      },
      {
        labelKey: 'userInfo.preference.elevator.no',
        patch: { useElevator: false },
        next: toQuestion(PREFERENCE_STEP.TRANSIT_CARD),
      },
    ],
  },
  [PREFERENCE_STEP.TRANSIT_CARD]: {
    questionKey: 'userInfo.preference.transitCard.question',
    choices: [
      {
        labelKey: 'userInfo.preference.transitCard.yes',
        patch: { hasTransitCard: true },
        next: toResult(ROUTE_PLAN.DIRECT),
      },
      {
        labelKey: 'userInfo.preference.transitCard.no',
        patch: { hasTransitCard: false },
        next: toQuestion(PREFERENCE_STEP.TICKET_METHOD),
      },
    ],
  },
  [PREFERENCE_STEP.TICKET_METHOD]: {
    questionKey: 'userInfo.preference.ticketMethod.question',
    choices: [
      {
        labelKey: 'userInfo.preference.ticketMethod.single',
        patch: { ticketMethod: TICKET_METHOD.SINGLE },
        next: toResult(ROUTE_PLAN.TICKET_MACHINE),
      },
      {
        labelKey: 'userInfo.preference.ticketMethod.buyCard',
        patch: { ticketMethod: TICKET_METHOD.BUY_CARD },
        next: toQuestion(PREFERENCE_STEP.CASH),
      },
    ],
  },
  [PREFERENCE_STEP.CASH]: {
    questionKey: 'userInfo.preference.cash.question',
    choices: [
      {
        labelKey: 'userInfo.preference.cash.yes',
        patch: { hasCash: true },
        next: toResult(ROUTE_PLAN.CONVENIENCE_STORE),
      },
      {
        labelKey: 'userInfo.preference.cash.no',
        patch: { hasCash: false },
        next: toResult(ROUTE_PLAN.ATM),
      },
    ],
  },
}

/** 확정된 계획의 안내 문구 i18n 키 */
export const PLAN_MESSAGE: Record<
  RoutePlan,
  { titleKey: string; descriptionKey: string }
> = {
  [ROUTE_PLAN.DIRECT]: {
    titleKey: 'userInfo.plan.direct.title',
    descriptionKey: 'userInfo.plan.direct.description',
  },
  [ROUTE_PLAN.TICKET_MACHINE]: {
    titleKey: 'userInfo.plan.ticketMachine.title',
    descriptionKey: 'userInfo.plan.ticketMachine.description',
  },
  [ROUTE_PLAN.CONVENIENCE_STORE]: {
    titleKey: 'userInfo.plan.convenienceStore.title',
    descriptionKey: 'userInfo.plan.convenienceStore.description',
  },
  [ROUTE_PLAN.ATM]: {
    titleKey: 'userInfo.plan.atm.title',
    descriptionKey: 'userInfo.plan.atm.description',
  },
}

/** 첫 질문 */
export const FIRST_NODE: PreferenceNode = toQuestion(PREFERENCE_STEP.ELEVATOR)
