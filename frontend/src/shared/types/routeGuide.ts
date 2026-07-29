/**
 * 경로 상세 안내(역 내 단계별 안내) 타입.
 * 명세: GET /api/v1/routes/navi
 *
 * 한 단계 = 지시문 한 줄 + 다음에 찾아야 할 표지판 한 장.
 * 사용자는 표지판을 하나씩 확인하며 단계를 넘긴다.
 */

/** 표지판이 가리키는 진행 방향. 화살표 회전에 쓴다. */
export const SIGN_DIRECTION = {
  /** 직진 */
  STRAIGHT: 'STRAIGHT',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  /** 위층(계단·에스컬레이터 상행) */
  UP: 'UP',
  /** 아래층(계단·에스컬레이터 하행) */
  DOWN: 'DOWN',
} as const

export type SignDirection = (typeof SIGN_DIRECTION)[keyof typeof SIGN_DIRECTION]

/** 표지판 오른쪽에 붙는 노선 뱃지 */
export interface SignLineBadge {
  /** 노선 번호·기호 ("4") */
  label: string
  /** 노선 공식 색. 노선마다 달라 BE가 값으로 내려준다. ("#00a5de") */
  color: string
}

/** 단계마다 한 장씩 보여주는 표지판 */
export interface GuideSign {
  /**
   * 왼쪽 노란 블록에 크게 들어가는 출구 번호 ("3").
   * 출구 표지판이 아니면 null이고, 이때 노란 블록을 그리지 않는다.
   */
  exitNumber: string | null
  /** 표지판 본문 ("3 · 4번 출구 방면") */
  title: string
  /** 본문 아래 영문 표기 ("To Exits 3 · 4") */
  subtitle: string
  lineBadge: SignLineBadge | null
  direction: SignDirection
  /**
   * 실제 표지판 사진(S3 URL).
   * 값이 있으면 사진을 보여주고, 없으면 위 필드로 표지판을 그려 대체한다.
   */
  photoUrl: string | null
}

/** 경로 상세 안내의 한 단계 */
export interface GuideStep {
  /** 1부터 시작하는 단계 번호 */
  order: number
  /** 이번 단계에서 해야 할 행동 ("3번 출구 방향으로 직진하세요") */
  instruction: string
  sign: GuideSign
}

/** 경로 상세 안내 전체 (GET /routes/navi 응답 본문) */
export interface RouteGuide {
  steps: GuideStep[]
}
