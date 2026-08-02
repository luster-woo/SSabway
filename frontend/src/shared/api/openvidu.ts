import axios, { type AxiosInstance } from 'axios'

import { endpoints } from '@/shared/api/endpoints'
import {
  CONSULTATION_STATUS,
  type ApiResponse,
  type ConsultationSession,
  type ConsultationSnapshot,
  type ConsultationStatus,
  type EndResult,
  type ParticipantRole,
  type WebrtcApiResponse,
} from '@/shared/types'

/**
 * 화상 상담 서버(ssabway_webrtc) 호출부. — 7/31 백엔드 최신화 반영
 *
 * 서버 흐름: sessions(생성) → connections(토큰) → start(녹음+IN_PROGRESS) → end.
 * 순서·실패 처리·세션 ID 규칙을 화면 코드가 알면 고칠 자리가 흩어지므로
 * 전부 이 파일에 가둔다.
 *
 * start 는 사용자와 역무원이 모두 접속한 뒤(streamCreated 이후) 불러야 한다 —
 * 팀 합의(7/31). 따라서 수락 시점(openSession)에는 부르지 않고,
 * 상담방 훅이 사용자 스트림을 받은 순간 startConsultation 을 부른다.
 */

/**
 * 세션 ID 생성 규칙.
 *
 * ⚠️ 백엔드와 공유하는 규칙이다. (양쪽 서비스의 SESSION_PREFIX 상수)
 * accept 통합안을 철회하고 sessionId 기준 API 로 확정했으므로(7/31)
 * 이 규칙은 계속 유지된다. 서버에서 접두사를 바꾸면 반드시 상호 공지할 것.
 */
const SESSION_ID_PREFIX = 'consultation-'

export function toSessionId(consultationId: number): string {
  return `${SESSION_ID_PREFIX}${String(consultationId)}`
}

interface SessionCreated {
  sessionId: string
}

interface ConnectionCreated {
  sessionId: string
  token: string
}

/**
 * BE 실제 DTO (ConsultationStartResponse / ConsultationEndResponse — 8/1 코드 확인).
 *
 * 노션 초기 명세의 started/ended: boolean 이 아니라 status 를 내려준다.
 * boolean 판정은 아래 startConsultation / endConsultation 이 status 로 계산한다.
 */
interface ConsultationStarted {
  sessionId: string
  status: ConsultationStatus
}

interface ConsultationEnded {
  sessionId: string
  recordingId: string
  status: ConsultationStatus
}

export interface JoinSessionOptions {
  /** 화면을 벗어나면 폴링을 멈추기 위한 신호 */
  signal?: AbortSignal
  /** 이 시간까지 세션이 안 열리면 실패로 본다. 기본 60초 */
  timeoutMs?: number
}

const JOIN_POLL_INTERVAL_MS = 3_000
const JOIN_TIMEOUT_MS = 60_000

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    function abort() {
      window.clearTimeout(timer)
      reject(new DOMException('중단되었습니다.', 'AbortError'))
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)

    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/**
 * "아직 세션이 안 열렸다"의 판정.
 *
 * GlobalExceptionHandler 도입(7/31)으로 이제 상태코드가 구분된다.
 *   404 OPENVIDU_SESSION_NOT_FOUND — 역무원이 아직 수락 전 → 재시도
 *   409 PARTICIPANT_ALREADY_CONNECTED — 같은 역할이 이미 접속(중복 탭 등) → 중단
 *   502 OPENVIDU_COMMUNICATION_FAILED — OpenVidu 서버 장애 → 중단
 *
 * ⚠️ 에러 응답에 code 필드가 아직 없어(message 는 한국어 안내문) 상태코드로만
 *    가른다. 같은 404 라도 CONSULTATION_NOT_FOUND 와 구분하지 못하지만,
 *    커넥션 발급 맥락에서 404 는 사실상 "세션 없음"이다.
 *    code 필드 추가를 백엔드에 요청해 둔 상태 — 들어오면 code 로 좁힌다.
 */
function isSessionNotReady(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return error.response?.status === 404
}

export function createOpenViduApi(api: AxiosInstance) {
  async function createSession(consultationId: number): Promise<string> {
    const res = await api.post<WebrtcApiResponse<SessionCreated>>(
      endpoints.openvidu.createSession,
      { consultationId },
    )
    return res.data.data.sessionId
  }

  async function createConnection(
    sessionId: string,
    participantId: string,
    role: ParticipantRole,
  ): Promise<ConnectionCreated> {
    const res = await api.post<WebrtcApiResponse<ConnectionCreated>>(
      endpoints.openvidu.createConnection(sessionId),
      { participantId, role },
    )
    return res.data.data
  }

  async function closeSession(sessionId: string): Promise<void> {
    await api.delete(endpoints.openvidu.closeSession(sessionId))
  }

  /**
   * 역무원이 상담을 수락할 때. 세션 생성 → 토큰 발급.
   *
   * 녹음은 여기서 시작하지 않는다 — start 가 사용자 접속 이후로 합의됐다.
   *
   * 선착순 판정은 서버가 한다. 두 역무원이 동시에 수락하면 늦은 쪽이
   * 세션 생성(409, OpenVidu customSessionId 충돌) 또는 커넥션 발급
   * (409 PARTICIPANT_ALREADY_CONNECTED / PARTICIPANT_LIMIT_EXCEEDED)에서 거절된다.
   *
   * 토큰 발급이 실패하면 방금 만든 세션을 되돌린다. 남겨두면 사용자 쪽
   * joinSession 이 "세션이 열렸다"고 오판해 들어가 혼자 기다리게 된다.
   * (closeSession 은 백엔드 재추가 예정 — 그 전까지 롤백 실패는 무시된다)
   */
  async function openSession(
    consultationId: number,
    participantId: string,
    role: ParticipantRole,
  ): Promise<ConsultationSession> {
    const sessionId = await createSession(consultationId)

    try {
      const connection = await createConnection(sessionId, participantId, role)
      return { consultationId, sessionId, token: connection.token }
    } catch (error) {
      await closeSession(sessionId).catch(() => {
        // 롤백 실패는 원래 오류를 덮지 않는다.
      })
      throw error
    }
  }

  /**
   * 이미 열려 있는 세션에 접속할 때. 사용자(여행객)와, 새로고침한 역무원이 쓴다.
   *
   * 세션은 역무원이 수락해야 생기므로, 열릴 때까지(404) 3초 간격으로 재시도한다.
   * 상담 상태 조회 API(BACKEND_READY.CONSULTATION_STATUS)가 생기면 사용자 쪽은
   * 상태 폴링 → 1회 접속으로 바뀌고, 이 함수는 역무원 새로고침 복구용으로 남는다.
   *
   * 재접속은 서버가 처리한다 — 같은 participantId 로 다시 커넥션을 받으면
   * 서버가 이전 커넥션을 끊고 새로 발급한다. 다른 participantId 면 409.
   */
  async function joinSession(
    consultationId: number,
    participantId: string,
    role: ParticipantRole,
    options: JoinSessionOptions = {},
  ): Promise<ConsultationSession> {
    const { signal, timeoutMs = JOIN_TIMEOUT_MS } = options
    const sessionId = toSessionId(consultationId)
    const deadline = Date.now() + timeoutMs

    for (;;) {
      try {
        const connection = await createConnection(sessionId, participantId, role)
        return { consultationId, sessionId, token: connection.token }
      } catch (error) {
        const canRetry =
          isSessionNotReady(error) &&
          Date.now() + JOIN_POLL_INTERVAL_MS < deadline

        if (!canRetry) throw error
        await delay(JOIN_POLL_INTERVAL_MS, signal)
      }
    }
  }

  /**
   * 상담 시작 — 녹음 시작 + WAITING→IN_PROGRESS + record_id 저장.
   *
   * 사용자와 역무원이 모두 접속한 뒤(사용자 streamCreated 이후) 역무원 쪽이 부른다.
   * 중복 호출은 서버가 멱등 처리하므로, 새로고침 후 다시 불러도 안전하고
   * 이미 진행 중이면 started: true 가 돌아와 REC 배지 복원에도 쓰인다.
   */
  async function startConsultation(sessionId: string): Promise<boolean> {
    const res = await api.post<WebrtcApiResponse<ConsultationStarted>>(
      endpoints.openvidu.start(sessionId),
    )
    // BE 는 started 가 아니라 status 를 준다. 시작됐다 = IN_PROGRESS.
    return res.data.data.status === CONSULTATION_STATUS.IN_PROGRESS
  }

  /**
   * 상담 종료 — 녹음 정지 + 세션 종료 + ENDED 전이.
   *
   * recordingId 는 보내지 않는다. 서버가 consultations.record_id 에서 스스로
   * 찾는다. 이미 종료된 상담이면 성공으로 응답하므로 재클릭에 안전하다.
   *
   * S3 업로드는 이 응답 이후 웹훅으로 비동기 진행된다 — 응답이 왔다고
   * 녹음 파일이 준비된 것은 아니다.
   */
  async function endConsultation(consultationId: number): Promise<EndResult> {
    const sessionId = toSessionId(consultationId)
    const res = await api.post<WebrtcApiResponse<ConsultationEnded>>(
      endpoints.openvidu.endConsultation(sessionId),
    )
    return {
      consultationId,
      sessionId: res.data.data.sessionId,
      // BE 는 ended 가 아니라 status 를 준다. 종료됐다 = ENDED.
      ended: res.data.data.status === CONSULTATION_STATUS.ENDED,
    }
  }

  // ─── 상담 도메인 API — ⚠️ BE 미구현 (BACKEND_READY.CONSULTATION_STATUS) ───

  /** 상담 요청 → 대기열 등록 */
  async function requestConsultation(): Promise<ConsultationSnapshot> {
    const res = await api.post<ApiResponse<ConsultationSnapshot>>(
      endpoints.consultations.create,
    )
    return res.data.data
  }

  /** 상담 상태 조회. 사용자가 매칭을 기다리며 3초 폴링한다. */
  async function fetchSnapshot(
    consultationId: number,
  ): Promise<ConsultationSnapshot> {
    const res = await api.get<ApiResponse<ConsultationSnapshot>>(
      endpoints.consultations.detail(consultationId),
    )
    return res.data.data
  }

  /**
   * 매칭된 사용자가 접속 토큰을 받는다.
   * 이 API 가 생기면 사용자 쪽 joinSession 폴링이 상태 폴링 + 1회 발급으로 바뀐다.
   */
  async function issueToken(
    consultationId: number,
  ): Promise<ConsultationSession> {
    const res = await api.post<
      ApiResponse<{ sessionId: string; token: string }>
    >(endpoints.consultations.token(consultationId))
    const { sessionId, token } = res.data.data
    return { consultationId, sessionId, token }
  }

  return {
    openSession,
    joinSession,
    startConsultation,
    endConsultation,
    closeSession,
    requestConsultation,
    fetchSnapshot,
    issueToken,
  }
}

export type OpenViduApi = ReturnType<typeof createOpenViduApi>
