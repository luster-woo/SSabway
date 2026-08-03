/**
 * BE 미연동 기능(사유 수정·해제)이 아직 참조하는 목 저장소.
 *
 * 등록·조회는 실제 API 로 옮겨졌다. 남은 용도는 민원 기록의 isBlack 표시와
 * 목 사유 수정·해제뿐이라 이메일→사유 문자열만 들고 있는다.
 * BE 연동이 끝나면 이 파일을 삭제한다.
 */

/** 명세서 예시를 따라 한 명은 미리 차단된 상태로 시작한다. */
const entries = new Map<string, string>([['user5@mail.com', '욕설/비방']])

export function isMockBlacklisted(userEmail: string): boolean {
  return entries.has(userEmail)
}

export function updateMockBlacklistReason(
  userEmail: string,
  reason: string,
): void {
  if (entries.has(userEmail)) entries.set(userEmail, reason)
}

export function removeMockBlacklist(userEmail: string): void {
  entries.delete(userEmail)
}
