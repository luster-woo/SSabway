import { USER_ACCOUNT } from '@/mocks/data'

/**
 * 블랙리스트 시뮬레이션.
 *
 * 실서버(ssabway BlacklistController)의 4개 API 를 목으로 대체한다.
 * 이 목이 없던 동안에는 블랙리스트 요청만 스위치 없이 실서버로 나가서,
 * USE_MSW 가 켜진 로컬에서도 등록·해제가 항상 실패했다
 * (`useBlacklist` 의 catch 가 false 로 접어 화면에는 "실패" 토스트만 떴다).
 *
 * 상태를 localStorage 에 두는 이유는 consultationQueue 와 같다 — admin 탭과
 * user 탭이 같은 데이터를 봐야 하고, 새로고침에도 남아야 명단 모달을
 * 여러 번 열어 확인할 수 있다.
 */

const STORAGE_KEY = 'msw:blacklist'

/** 페이지당 건수. 백엔드 BlacklistService 와 같은 값으로 맞춘다. */
export const MOCK_BLACKLIST_PAGE_SIZE = 5

export interface MockBlacklistEntry {
  userEmail: string
  reasons: string[]
  registeredAt: string
  /** null 이면 활성(차단 중). 값이 있으면 해제된 이력 */
  releasedAt: string | null
}

function readEntries(): MockBlacklistEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MockBlacklistEntry[]
  } catch {
    return []
  }
}

function writeEntries(entries: MockBlacklistEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

/** 활성 차단만. 해제된 이력은 명단에서 빠진다 (BE 의 releasedAt IS NULL 조건). */
function activeEntries(): MockBlacklistEntry[] {
  return readEntries().filter((entry) => entry.releasedAt === null)
}

export function isMockBlacklisted(userEmail: string): boolean {
  return activeEntries().some((entry) => entry.userEmail === userEmail)
}

/**
 * 블랙리스트 등록. 이미 활성 차단이면 'DUPLICATED' (BE 의 BLACKLIST_DUPLICATED 409).
 * 등록되지 않은 이메일이어도 목은 사용자 존재를 검사하지 않는다.
 */
export function registerMockBlacklist(
  userEmail: string,
  reasons: string[],
): 'OK' | 'DUPLICATED' {
  if (isMockBlacklisted(userEmail)) return 'DUPLICATED'

  writeEntries([
    ...readEntries(),
    {
      userEmail,
      reasons,
      registeredAt: new Date().toISOString(),
      releasedAt: null,
    },
  ])
  return 'OK'
}

/** 사유 수정. 활성 차단이 없으면 'NOT_FOUND' (BE 의 BLACKLIST_NOT_FOUND 404). */
export function updateMockBlacklistReasons(
  userEmail: string,
  reasons: string[],
): 'OK' | 'NOT_FOUND' {
  const entries = readEntries()
  const target = entries.find(
    (entry) => entry.userEmail === userEmail && entry.releasedAt === null,
  )
  if (!target) return 'NOT_FOUND'

  writeEntries(
    entries.map((entry) => (entry === target ? { ...entry, reasons } : entry)),
  )
  return 'OK'
}

/** 차단 해제. 활성 차단이 없으면 'NOT_FOUND'. */
export function releaseMockBlacklist(
  userEmail: string,
): 'OK' | 'NOT_FOUND' {
  const entries = readEntries()
  const target = entries.find(
    (entry) => entry.userEmail === userEmail && entry.releasedAt === null,
  )
  if (!target) return 'NOT_FOUND'

  writeEntries(
    entries.map((entry) =>
      entry === target
        ? { ...entry, releasedAt: new Date().toISOString() }
        : entry,
    ),
  )
  return 'OK'
}

/**
 * 명단 조회 (1-based 페이지). 응답 모양은 백엔드 PageResponse 를 따른다.
 *
 * 등록 시각 내림차순 — 최근에 차단한 사용자가 위로 온다.
 */
export function listMockBlacklist(page: number): {
  content: Omit<MockBlacklistEntry, 'releasedAt'>[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
  }
} {
  const all = [...activeEntries()].sort((a, b) =>
    b.registeredAt.localeCompare(a.registeredAt),
  )

  const size = MOCK_BLACKLIST_PAGE_SIZE
  const totalElements = all.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * size

  return {
    content: all.slice(start, start + size).map(({ releasedAt, ...rest }) => {
      void releasedAt
      return rest
    }),
    page: {
      number: current,
      size,
      totalElements,
      totalPages,
      first: current === 1,
      last: current === totalPages,
    },
  }
}

/**
 * 명단을 눈으로 확인할 수 있게 초기 1건을 심는다.
 *
 * 비어 있으면 모달이 "없습니다" 만 보여줘서 페이지네이션·해제 버튼을 눌러 볼
 * 수 없다. 목 사용자와 다른 이메일이라 상담 요청 테스트를 방해하지 않는다.
 */
export function seedMockBlacklist(): void {
  if (readEntries().length > 0) return

  writeEntries([
    {
      userEmail: `blocked.${USER_ACCOUNT.email}`,
      reasons: ['ABUSE'],
      registeredAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      releasedAt: null,
    },
  ])
}
