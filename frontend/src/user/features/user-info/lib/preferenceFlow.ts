import {
  PREFERENCE_STEP,
  PREPARATION_TASK,
  WAYPOINT,
  type PreferenceStep,
  type PreparationTask,
  type RoutePlan,
  type RoutePreference,
  type Waypoint,
} from '@/shared/types/guide'

/** 현금 질문은 어느 갈래로 왔는지 알아야 결과를 만들 수 있다. */
interface CashQuestionNode {
  kind: 'question'
  step: typeof PREFERENCE_STEP.CASH
  /** PREPARATION에서 고른 일. 결과 계획의 목적지를 정한다. */
  task: PreparationTask
}

/** 나머지 질문은 이전 답과 무관하게 혼자 성립한다. */
interface PlainQuestionNode {
  kind: 'question'
  step: Exclude<PreferenceStep, typeof PREFERENCE_STEP.CASH>
}

export type QuestionNode = PlainQuestionNode | CashQuestionNode

/** 카드에 지금 무엇을 그릴지 — 질문 하나이거나, 확정된 경유 계획이다. */
export type PreferenceNode = QuestionNode | { kind: 'result'; plan: RoutePlan }

function toQuestion(step: PlainQuestionNode['step']): PreferenceNode {
  return { kind: 'question', step }
}

function toCashQuestion(task: PreparationTask): PreferenceNode {
  return { kind: 'question', step: PREFERENCE_STEP.CASH, task }
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

/** 카드가 준비돼 있어 아무 데도 들르지 않는 계획 */
const DIRECT_PLAN: RoutePlan = { task: null, waypoints: [] }

/** 할 일 → 그 일을 처리할 수 있는 시설 */
const TASK_DESTINATION: Record<PreparationTask, Waypoint> = {
  [PREPARATION_TASK.CHARGE]: WAYPOINT.CONVENIENCE_STORE,
  [PREPARATION_TASK.BUY_CARD]: WAYPOINT.CONVENIENCE_STORE,
  [PREPARATION_TASK.SINGLE_TICKET]: WAYPOINT.TICKET_MACHINE,
}

/**
 * 할 일과 현금 유무가 모두 확정됐을 때의 최종 계획.
 *
 * 현금이 없으면 ATM을 목적지 앞에 붙인다. 순서를 여기서 정해 두면 경로 계산이
 * "ATM을 먼저 가야 하나"를 다시 판단하지 않아도 된다.
 */
function toPlanResult(task: PreparationTask, hasCash: boolean): PreferenceNode {
  const destination = TASK_DESTINATION[task]

  return toResult({
    task,
    waypoints: hasCash ? [destination] : [WAYPOINT.ATM, destination],
  })
}

/**
 * 이전 답과 무관한 질문들의 분기표.
 *
 *   엘리베이터 → 카드 준비됨? ─ 예 → 바로 탑승 (행복 경로, 여기서 끝)
 *                            └ 아니요 → 무엇이 필요? ─ 충전   ┐
 *                                                    ├ 카드구매 ├→ 현금?
 *                                                    └ 1회권   ┘
 *
 * 현금 질문은 세 갈래가 공유하므로 표가 아니라 `cashQuestion()`이 만든다.
 */
const PLAIN_QUESTIONS: Record<PlainQuestionNode['step'], PreferenceQuestion> = {
  [PREFERENCE_STEP.ELEVATOR]: {
    questionKey: 'userInfo.preference.elevator.question',
    choices: [
      {
        labelKey: 'userInfo.preference.elevator.yes',
        patch: { useElevator: true },
        next: toQuestion(PREFERENCE_STEP.CARD_READY),
      },
      {
        labelKey: 'userInfo.preference.elevator.no',
        patch: { useElevator: false },
        next: toQuestion(PREFERENCE_STEP.CARD_READY),
      },
    ],
  },
  [PREFERENCE_STEP.CARD_READY]: {
    questionKey: 'userInfo.preference.cardReady.question',
    choices: [
      {
        labelKey: 'userInfo.preference.cardReady.yes',
        patch: { isCardReady: true },
        next: toResult(DIRECT_PLAN),
      },
      {
        labelKey: 'userInfo.preference.cardReady.no',
        patch: { isCardReady: false },
        next: toQuestion(PREFERENCE_STEP.PREPARATION),
      },
    ],
  },
  [PREFERENCE_STEP.PREPARATION]: {
    questionKey: 'userInfo.preference.preparation.question',
    choices: [
      {
        labelKey: 'userInfo.preference.preparation.charge',
        patch: { preparationTask: PREPARATION_TASK.CHARGE },
        next: toCashQuestion(PREPARATION_TASK.CHARGE),
      },
      {
        labelKey: 'userInfo.preference.preparation.buyCard',
        patch: { preparationTask: PREPARATION_TASK.BUY_CARD },
        next: toCashQuestion(PREPARATION_TASK.BUY_CARD),
      },
      {
        labelKey: 'userInfo.preference.preparation.singleTicket',
        patch: { preparationTask: PREPARATION_TASK.SINGLE_TICKET },
        next: toCashQuestion(PREPARATION_TASK.SINGLE_TICKET),
      },
    ],
  },
}

/** 현금 질문. 문구는 갈래와 무관하게 같고, 결과만 갈래에 따라 달라진다. */
function cashQuestion(task: PreparationTask): PreferenceQuestion {
  return {
    questionKey: 'userInfo.preference.cash.question',
    choices: [
      {
        labelKey: 'userInfo.preference.cash.yes',
        patch: { hasCash: true },
        next: toPlanResult(task, true),
      },
      {
        labelKey: 'userInfo.preference.cash.no',
        patch: { hasCash: false },
        next: toPlanResult(task, false),
      },
    ],
  }
}

/** 지금 화면에 띄울 질문. 현금 질문만 노드가 들고 있는 갈래 정보를 쓴다. */
export function getQuestion(node: QuestionNode): PreferenceQuestion {
  return node.step === PREFERENCE_STEP.CASH
    ? cashQuestion(node.task)
    : PLAIN_QUESTIONS[node.step]
}

/** 할 일별 안내 문구의 i18n 키 접두사 */
const TASK_MESSAGE_PREFIX: Record<PreparationTask, string> = {
  [PREPARATION_TASK.CHARGE]: 'userInfo.plan.charge',
  [PREPARATION_TASK.BUY_CARD]: 'userInfo.plan.buyCard',
  [PREPARATION_TASK.SINGLE_TICKET]: 'userInfo.plan.singleTicket',
}

export interface PlanMessage {
  titleKey: string
  descriptionKey: string
}

/**
 * 확정된 계획의 안내 문구 i18n 키.
 *
 * ATM 경유는 같은 할 일의 변형이라 별도 계획으로 두지 않고 문구만 바꾼다.
 * (`atmTitle`/`atmDescription`)
 */
export function getPlanMessage(plan: RoutePlan): PlanMessage {
  if (plan.task === null) {
    return {
      titleKey: 'userInfo.plan.direct.title',
      descriptionKey: 'userInfo.plan.direct.description',
    }
  }

  const prefix = TASK_MESSAGE_PREFIX[plan.task]
  const viaAtm = plan.waypoints.includes(WAYPOINT.ATM)

  return viaAtm
    ? {
        titleKey: `${prefix}.atmTitle`,
        descriptionKey: `${prefix}.atmDescription`,
      }
    : { titleKey: `${prefix}.title`, descriptionKey: `${prefix}.description` }
}

/** 첫 질문 */
export const FIRST_NODE: PreferenceNode = toQuestion(PREFERENCE_STEP.ELEVATOR)
