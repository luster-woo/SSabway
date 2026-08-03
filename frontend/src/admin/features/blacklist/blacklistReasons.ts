/**
 * 위반 사유 선택지.
 *
 * 자유 입력이 아니라 고정 목록에서 고른다. 사유가 통계·재발 판단에 쓰이므로
 * 표기가 갈리면 집계가 안 되고, 역무원이 매번 문장을 쓰는 부담도 줄인다.
 */
export const BLACKLIST_REASONS = [
  '욕설/비방',
  '성희롱',
  '스팸',
  '허위',
  '음란행위',
] as const

export type BlacklistReason = (typeof BLACKLIST_REASONS)[number]

/**
 * 선택한 사유들을 API 의 reason 문자열 하나로 합친다.
 * 목록 정의 순서를 유지해서 같은 조합이면 항상 같은 문자열이 되도록 한다.
 *
 * TODO: API 의 reason 이 String 단일 필드라 여러 사유를 콤마로 이어 보낸다.
 *       BE 와 배열 전달 방식을 합의하면 이 함수를 제거한다.
 */
export function joinReasons(reasons: readonly BlacklistReason[]): string {
  return BLACKLIST_REASONS.filter((reason) => reasons.includes(reason)).join(
    ', ',
  )
}

/** reason 문자열을 선택지로 되돌린다. 목록에 없는 값은 버린다. */
export function splitReasons(reason: string): BlacklistReason[] {
  const parts = reason.split(',').map((part) => part.trim())
  return BLACKLIST_REASONS.filter((candidate) => parts.includes(candidate))
}

/**
 * 화면 라벨(한글) → 백엔드 enum 코드(영문) 매핑.
 * 등록 API 의 reasons 는 영문 코드 배열이라 전송 직전에 변환해야 한다.
 */
export const REASON_CODE = {
  '욕설/비방': 'ABUSE',
  성희롱: 'SEXUAL_HARASSMENT',
  스팸: 'SPAM',
  허위: 'FALSE_INFO',
  음란행위: 'OBSCENITY',
} as const satisfies Record<BlacklistReason, string>

/** 백엔드 BlacklistReason enum 과 1:1 인 코드 유니온. */
export type BlacklistReasonCode = (typeof REASON_CODE)[BlacklistReason]

/**
 * 모달이 만든 사유 문자열(콤마 결합 한글)을 백엔드 enum 코드 배열로 바꾼다.
 * 목록에 없는 값은 splitReasons 가 이미 걸러 낸다.
 */
export function toReasonCodes(reason: string): BlacklistReasonCode[] {
  return splitReasons(reason).map((label) => REASON_CODE[label])
}
