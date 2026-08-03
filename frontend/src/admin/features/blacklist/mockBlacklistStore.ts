/**
 * BE 미연동인 민원 기록 화면이 isBlack 표시에만 쓰는 목 저장소.
 * 등록·조회·해제·사유수정은 모두 실제 API 로 옮겨졌다. BE 연동이 끝나면 이 파일을 삭제한다.
 */

/** 명세서 예시를 따라 한 명은 미리 차단된 상태로 시작한다. */
const blacklistedEmails = new Set<string>(['user5@mail.com'])

export function isMockBlacklisted(userEmail: string): boolean {
  return blacklistedEmails.has(userEmail)
}
