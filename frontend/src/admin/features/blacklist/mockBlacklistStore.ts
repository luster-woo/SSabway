import type { BlacklistEntry } from '@/admin/features/blacklist/useBlacklist'

/**
 * BE 개발 전 목 전용 저장소.
 *
 * 블랙리스트 등록·수정·해제 결과가 민원 기록의 isBlack 표시와 명단 목록에
 * 함께 반영되어야 화면 흐름을 확인할 수 있어서 모듈 수준에 상태를 둔다.
 * BE 연동 시 이 파일을 삭제한다.
 */

let nextBlacklistId = 5

/** 명세서 예시를 따라 한 명은 미리 차단된 상태로 시작한다. */
const entries = new Map<string, BlacklistEntry>([
  [
    'user5@mail.com',
    {
      blacklistId: 4,
      userEmail: 'user5@mail.com',
      reason: '욕설/비방',
      registerTime: new Date().toISOString(),
    },
  ],
])

export function isMockBlacklisted(userEmail: string): boolean {
  return entries.has(userEmail)
}

export function listMockBlacklist(): BlacklistEntry[] {
  return [...entries.values()]
}

export function addMockBlacklist(userEmail: string, reason: string): void {
  entries.set(userEmail, {
    blacklistId: nextBlacklistId++,
    userEmail,
    reason,
    registerTime: new Date().toISOString(),
  })
}

export function updateMockBlacklistReason(
  userEmail: string,
  reason: string,
): void {
  const entry = entries.get(userEmail)
  if (entry) entries.set(userEmail, { ...entry, reason })
}

export function removeMockBlacklist(userEmail: string): void {
  entries.delete(userEmail)
}
