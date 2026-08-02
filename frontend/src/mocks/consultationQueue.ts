import { toSessionId } from '@/shared/api/openvidu'
import {
  CONSULTATION_STATUS,
  type ConsultationSnapshot,
} from '@/shared/types'
import { USER_ACCOUNT } from '@/mocks/data'

/**
 * 상담 대기열 + 화상 세션 시뮬레이션.
 *
 * handlers.ts 는 "규칙만" 다룬다는 원칙에 따라, 상태가 필요한 시뮬레이션은
 * 이 파일에 가둔다.
 *
 * 상태를 localStorage 에 두는 이유 — 한 컴퓨터에서 user 탭과 admin 탭을
 * 동시에 띄워 실험하기 위해서다. MSW 핸들러는 탭마다 따로 돌기 때문에
 * 모듈 변수로는 두 탭이 같은 대기열을 볼 수 없다. localStorage 는 같은
 * 오리진의 모든 탭이 공유하므로 "user 가 요청 → admin 목록에 등장 →
 * admin 수락 → user 매칭"이 실제 순서대로 흘러간다.
 * (10분 지나면 이전 실험 잔재로 오동작하지 않도록 자동 초기화)
 *
 * 매칭 규칙:
 *   - admin 탭이 대기 목록을 한 번이라도 조회하면(adminSeen) 자동 매칭을
 *     멈추고 역무원의 수락(세션 생성)을 기다린다.
 *   - admin 탭이 없으면(사용자 단독 테스트) 폴링 3회 뒤 자동 매칭된다.
 *
 * ⚠️ 여기서 발급되는 토큰은 가짜라서 openvidu-browser 접속은 실패한다.
 *    검증 범위는 "요청 → 대기 → 수락/매칭 → 토큰 발급 → 시작/종료 상태 전이"까지.
 */

/** 시작 대기 순번. 사용자 단독 테스트면 폴링(3초) 3회 뒤 자동 매칭된다. */
export const INITIAL_QUEUE_POSITION = 3

/** 수락(세션 생성) 시 배정되는 역무원 이름 */
export const MOCK_STAFF_NAME = '김안내'

const STORAGE_KEY = 'msw:consultation-queue'

/** 이전 실험의 잔재가 남아 409 만 나는 상황을 막는다. */
const STATE_TTL_MS = 10 * 60_000

interface QueueState {
  snapshot: ConsultationSnapshot | null
  /** admin 탭이 대기 목록을 조회했는가 — true 면 자동 매칭을 멈춘다 */
  adminSeen: boolean
  /** 열려 있는 OpenVidu 세션 ID 목록 */
  sessions: string[]
  nextId: number
  updatedAt: number
}

const INITIAL_STATE: QueueState = {
  snapshot: null,
  adminSeen: false,
  sessions: [],
  nextId: 501,
  updatedAt: 0,
}

function readState(): QueueState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...INITIAL_STATE }

    const state = JSON.parse(raw) as QueueState
    if (Date.now() - state.updatedAt > STATE_TTL_MS) {
      return { ...INITIAL_STATE, nextId: state.nextId }
    }
    return state
  } catch {
    return { ...INITIAL_STATE }
  }
}

function writeState(state: QueueState): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...state, updatedAt: Date.now() }),
  )
}

function isActiveStatus(snapshot: ConsultationSnapshot): boolean {
  return (
    snapshot.status === CONSULTATION_STATUS.WAITING ||
    snapshot.status === CONSULTATION_STATUS.MATCHED ||
    snapshot.status === CONSULTATION_STATUS.IN_PROGRESS
  )
}

/* ------------------------------------------------------------------ *
 * 사용자 쪽 — POST /consultations 3종
 * ------------------------------------------------------------------ */

/** 상담 요청. 진행 중 상담이 있으면 'DUPLICATED' (명세의 409). */
export function createMockConsultation(): ConsultationSnapshot | 'DUPLICATED' {
  const state = readState()

  if (state.snapshot && isActiveStatus(state.snapshot)) return 'DUPLICATED'

  const snapshot: ConsultationSnapshot = {
    consultationId: state.nextId,
    status: CONSULTATION_STATUS.WAITING,
    queuePosition: INITIAL_QUEUE_POSITION,
    staffName: null,
    requestedAt: new Date().toISOString(),
    startedAt: null,
  }

  writeState({
    ...state,
    snapshot,
    nextId: state.nextId + 1,
    adminSeen: state.adminSeen,
  })
  return snapshot
}

/**
 * 상태 조회. 폴링 1회마다 순번을 하나 줄인다.
 *
 * admin 탭이 붙어 있으면(adminSeen) 순번 1에서 멈추고 수락을 기다린다.
 * admin 탭이 없으면 0이 되는 순간 자동 매칭한다 — 사용자 단독 테스트용.
 */
export function pollMockConsultation(
  consultationId: number,
): ConsultationSnapshot | null {
  const state = readState()
  const { snapshot } = state

  if (!snapshot || snapshot.consultationId !== consultationId) return null
  if (snapshot.status !== CONSULTATION_STATUS.WAITING) return snapshot

  const nextPosition = Math.max(
    state.adminSeen ? 1 : 0,
    (snapshot.queuePosition ?? 1) - 1,
  )

  const next: ConsultationSnapshot =
    nextPosition <= 0
      ? {
          ...snapshot,
          status: CONSULTATION_STATUS.MATCHED,
          queuePosition: null,
          staffName: MOCK_STAFF_NAME,
        }
      : { ...snapshot, queuePosition: nextPosition }

  writeState({ ...state, snapshot: next })
  return next
}

/**
 * 접속 토큰 발급. MATCHED 이후에만 성공한다.
 * sessionId 는 백엔드와 공유하는 규칙(toSessionId)을 그대로 따른다.
 */
export function issueMockConsultationToken(
  consultationId: number,
): { sessionId: string; token: string } | 'NOT_FOUND' | 'NOT_MATCHED' {
  const { snapshot } = readState()

  if (!snapshot || snapshot.consultationId !== consultationId)
    return 'NOT_FOUND'
  if (snapshot.status === CONSULTATION_STATUS.WAITING) return 'NOT_MATCHED'

  return {
    sessionId: toSessionId(consultationId),
    // 가짜 토큰. openvidu-browser 에 넣으면 접속은 실패한다 (파일 상단 주석 참고).
    token: `mock-openvidu-token-${String(consultationId)}`,
  }
}

/* ------------------------------------------------------------------ *
 * 관리자 쪽 — GET /admin/consultations?status=WAITING
 * ------------------------------------------------------------------ */

/**
 * admin 대기 목록의 한 건. admin/features 의 WaitingConsultation 과 같은 모양.
 * (mocks 가 admin 레이어를 import 하지 않으려고 구조만 맞춘 로컬 타입)
 */
export interface MockWaitingItem {
  consultationId: number
  email: string
  startPoint: string
  finalPoint: string
  langCode: string
  status: string
  requestedAt: string
}

/**
 * 대기 목록 조회. 호출 자체가 "admin 탭이 붙었다"는 신호이므로
 * 이후 사용자 쪽 자동 매칭을 멈춘다 (수락은 역무원 몫).
 */
export function listMockWaitingConsultations(): MockWaitingItem[] {
  const state = readState()

  if (!state.adminSeen) writeState({ ...state, adminSeen: true })

  const { snapshot } = state
  if (!snapshot || snapshot.status !== CONSULTATION_STATUS.WAITING) return []

  return [
    {
      consultationId: snapshot.consultationId,
      // 사용자 정보는 대기열 요청에 없어 목 계정으로 채운다.
      email: USER_ACCOUNT.email,
      startPoint: '대구역',
      finalPoint: '경북대 북문',
      langCode: 'EN',
      status: snapshot.status,
      requestedAt: snapshot.requestedAt,
    },
  ]
}

/* ------------------------------------------------------------------ *
 * 화상 세션 — POST /openvidu/* (역무원 수락 = 세션 생성)
 * ------------------------------------------------------------------ */

/**
 * 세션 생성 = 역무원 수락. 해당 상담이 대기 중이면 MATCHED 로 바꾼다.
 * (대기열에 없는 상담 ID 로도 세션은 만들어진다 — MOCK_WAITING 의
 *  고정 항목을 수락하는 admin 단독 테스트를 막지 않기 위해서)
 */
export function openMockSession(consultationId: number): string {
  const state = readState()
  const sessionId = toSessionId(consultationId)

  const snapshot =
    state.snapshot &&
    state.snapshot.consultationId === consultationId &&
    state.snapshot.status === CONSULTATION_STATUS.WAITING
      ? {
          ...state.snapshot,
          status: CONSULTATION_STATUS.MATCHED,
          queuePosition: null,
          staffName: MOCK_STAFF_NAME,
        }
      : state.snapshot

  writeState({
    ...state,
    snapshot,
    sessions: state.sessions.includes(sessionId)
      ? state.sessions
      : [...state.sessions, sessionId],
  })
  return sessionId
}

export function hasMockSession(sessionId: string): boolean {
  return readState().sessions.includes(sessionId)
}

/** 커넥션(접속 토큰) 발급. 세션이 없으면 null — 핸들러가 404 로 바꾼다. */
export function createMockConnection(
  sessionId: string,
  participantId: string,
): { sessionId: string; token: string } | null {
  if (!hasMockSession(sessionId)) return null
  return { sessionId, token: `mock-openvidu-token-${participantId}` }
}

/** 상담 시작 — WAITING/MATCHED → IN_PROGRESS. 세션이 없으면 null. */
export function startMockConsultation(sessionId: string): 'IN_PROGRESS' | null {
  const state = readState()
  if (!state.sessions.includes(sessionId)) return null

  const { snapshot } = state
  writeState({
    ...state,
    snapshot:
      snapshot && toSessionId(snapshot.consultationId) === sessionId
        ? {
            ...snapshot,
            status: CONSULTATION_STATUS.IN_PROGRESS,
            startedAt: new Date().toISOString(),
          }
        : snapshot,
  })
  return 'IN_PROGRESS'
}

/** 상담 종료 — 세션 제거 + ENDED. 이미 없어도 성공 취급 (BE 와 동일하게 멱등). */
export function endMockConsultation(sessionId: string): {
  recordingId: string
} {
  const state = readState()
  const { snapshot } = state

  writeState({
    ...state,
    sessions: state.sessions.filter((id) => id !== sessionId),
    snapshot:
      snapshot && toSessionId(snapshot.consultationId) === sessionId
        ? { ...snapshot, status: CONSULTATION_STATUS.ENDED }
        : snapshot,
  })
  return { recordingId: `mock-recording-${sessionId}` }
}

/** 세션 정리(수락 실패 롤백). 매칭됐던 상담은 다시 대기로 되돌린다. */
export function closeMockSession(sessionId: string): void {
  const state = readState()
  const { snapshot } = state

  writeState({
    ...state,
    sessions: state.sessions.filter((id) => id !== sessionId),
    snapshot:
      snapshot &&
      toSessionId(snapshot.consultationId) === sessionId &&
      snapshot.status === CONSULTATION_STATUS.MATCHED
        ? {
            ...snapshot,
            status: CONSULTATION_STATUS.WAITING,
            queuePosition: 1,
            staffName: null,
          }
        : snapshot,
  })
}
