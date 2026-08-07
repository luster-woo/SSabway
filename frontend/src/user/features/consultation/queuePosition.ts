/**
 * 서버가 주는 `queuePosition` 은 **자기 자신을 포함한 1부터의 순번**이다.
 * (BE `ConsultationRepository.calculateQueuePosition` 이 조회 대상 상담까지 COUNT 한다.
 *  요청 응답의 `queuePosition` 도 저장 직후 WAITING 개수라 동일하게 자신을 포함한다.)
 *
 * 사용자는 이 숫자를 "내 앞에 몇 명"으로 읽는다. 그대로 보여주면 항상 한 명이
 * 부풀려지고, 혼자 대기할 때 "앞에 1명 대기 중"이라는 틀린 문구가 나온다.
 * 화면에 숫자를 찍기 전에 반드시 이 함수를 거친다.
 *
 * @param queuePosition 서버 순번(1부터). WAITING 이 아니면 null
 * @returns 내 앞에 남은 인원. 순번을 모르면 null, 내가 맨 앞이면 0
 */
export function peopleAheadInQueue(
  queuePosition: number | null,
): number | null {
  if (queuePosition === null) return null

  return Math.max(0, queuePosition - 1)
}
