import axios, { type AxiosInstance } from 'axios'

import { BACKEND_READY } from '@/shared/api/backendCapabilities'
import { endpoints } from '@/shared/api/endpoints'
import type {
  AcceptResult,
  ApiResponse,
  ConsultationSession,
  ConsultationSnapshot,
  EndResult,
  ParticipantRole,
  WebrtcApiResponse,
} from '@/shared/types'

/**
 * 화상 상담 서버 호출부.
 *
 * 백엔드에 상담 리소스 래퍼가 아직 없어서, "역무원이 상담을 수락한다"는 한 동작이
 * 세 번의 HTTP 호출로 쪼개져 있다. 순서·롤백·세션 ID 규칙을 화면 코드가 알면
 * 래퍼가 생겼을 때 고칠 자리가 흩어지므로 전부 이 파일에 가둔다.
 *
 * 래퍼가 들어오면 BACKEND_READY 플래그만 켜면 되고, 화면·훅은 손대지 않는다.
 */

/**
 * 세션 ID 생성 규칙. — ⚠️ 임시
 *
 * 백엔드와 암묵적으로 공유하는 규칙이다.
 *   - OpenViduService.createSession — customSessionId("consultation-" + consultationId)
 *   - ConsultationEndService.SESSION_PREFIX
 * accept 래퍼가 consultationId 기준이 되면 이 함수는 통째로 삭제한다.
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

interface RecordingStarted {
  recordingId: string
  sessionId: string
  status: string
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
 * "아직 세션이 안 열렸다" 와 "서버가 고장났다" 를 구분한다.
 *
 * ⚠️ ERROR_CODES 플래그가 꺼져 있는 동안은 구분할 수 없다. 백엔드가 존재하지 않는
 * 세션에 IllegalStateException 을 던지고 @RestControllerAdvice 가 없어서 둘 다
 * 500 으로 나오기 때문이다. 그래서 5xx 도 "아직 아님" 으로 보고 재시도하되,
 * timeoutMs 로 상한을 둔다. 그동안은 서버 장애가 "대기 중" 으로 보인다.
 */
function isSessionNotReady(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  if (status === undefined) return false // 네트워크 오류는 재시도하지 않는다

  if (BACKEND_READY.ERROR_CODES) return status === 409
  return status === 409 || status >= 500
}

export function createOpenViduApi(api: AxiosInstance) {
  // ─── OpenVidu 원시 API (래퍼가 생기면 openSession 내부에서만 쓰인다) ───

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

  async function startRecording(sessionId: string): Promise<RecordingStarted> {
    const res = await api.post<WebrtcApiResponse<RecordingStarted>>(
      endpoints.openvidu.startRecording(sessionId),
    )
    return res.data.data
  }

  async function closeSession(sessionId: string): Promise<void> {
    await api.delete(endpoints.openvidu.closeSession(sessionId))
  }

  // ─── 화면이 쓰는 업무 단위 ───

  /**
   * 역무원이 상담을 수락할 때. 세션 생성 → 토큰 발급 → 녹음 시작.
   *
   * 토큰 발급이 실패하면 방금 만든 세션을 되돌린다. 남겨두면 아무도 못 들어가는
   * 빈 세션이 쌓이고, 사용자 쪽은 세션이 열렸다고 판단해 접속을 시도하다 실패한다.
   *
   * 녹음 실패는 롤백하지 않는다. 통화는 성립하므로 끊을 이유가 없고,
   * 명세도 녹음 실패 시 통화를 계속하도록 되어 있다. (NFR-REL-003 5번)
   */
  async function openSession(
    consultationId: number,
    participantId: string,
    role: ParticipantRole,
  ): Promise<ConsultationSession> {
    if (BACKEND_READY.CONSULTATION_ACCEPT) {
      const res = await api.post<ApiResponse<AcceptResult>>(
        endpoints.admin.accept(consultationId),
      )
      const { sessionId, token, recordingId } = res.data.data
      return { consultationId, sessionId, token, recordingId }
    }

    const sessionId = await createSession(consultationId)

    let token: string
    try {
      const connection = await createConnection(sessionId, participantId, role)
      token = connection.token
    } catch (error) {
      await closeSession(sessionId).catch(() => {
        // 롤백 실패는 원래 오류를 덮지 않는다. 세션은 통화 종료 시 정리된다.
      })
      throw error
    }

    let recordingId: string | null = null
    try {
      recordingId = (await startRecording(sessionId)).recordingId
    } catch {
      // 녹음만 실패. AI 요약이 없을 뿐 통화는 진행한다.
    }

    return { consultationId, sessionId, token, recordingId }
  }

  /**
   * 이미 열려 있는 세션에 접속할 때. 사용자(여행객)와, 새로고침한 역무원이 쓴다.
   *
   * ⚠️ 임시 경로다. 세션은 역무원이 수락해야 생기는데 서버가 "아직 매칭 안 됨"을
   * 구분해 주지 않아 실패를 폴링으로 흡수한다. CONSULTATION_STATUS 가 켜지면
   * 사용자 쪽은 상태 폴링 → issueToken 으로 바뀌고, 이 함수는 역무원 새로고침
   * 복구용으로만 남는다.
   *
   * 재호출은 안전하다. 매번 새 Connection 이 생기지만 쓰지 않은 커넥션은
   * OpenVidu 가 세션 종료 시 함께 정리한다.
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
        return {
          consultationId,
          sessionId,
          token: connection.token,
          recordingId: null,
        }
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
   * 매칭된 사용자가 접속 토큰을 받는다. — ⚠️ CONSULTATION_STATUS 필요
   *
   * 명세상 TTL 5분·재발급 5회이고 재연결 시 반복 호출한다.
   * 이 API 가 생기면 사용자 쪽에서 joinSession 폴링이 사라진다.
   */
  async function issueToken(
    consultationId: number,
  ): Promise<ConsultationSession> {
    const res = await api.post<ApiResponse<{ sessionId: string; token: string }>>(
      endpoints.consultations.token(consultationId),
    )
    const { sessionId, token } = res.data.data
    return { consultationId, sessionId, token, recordingId: null }
  }

  /** 상담 상태 조회. 사용자가 매칭을 기다리며 폴링한다. — ⚠️ CONSULTATION_STATUS 필요 */
  async function fetchSnapshot(
    consultationId: number,
  ): Promise<ConsultationSnapshot> {
    const res = await api.get<ApiResponse<ConsultationSnapshot>>(
      endpoints.consultations.detail(consultationId),
    )
    return res.data.data
  }

  /** 상담 요청 → 대기열 등록. — ⚠️ CONSULTATION_STATUS 필요 */
  async function requestConsultation(): Promise<ConsultationSnapshot> {
    const res = await api.post<ApiResponse<ConsultationSnapshot>>(
      endpoints.consultations.create,
    )
    return res.data.data
  }

  /**
   * 상담 종료 — 녹음 정지 + 세션 종료 + ENDED 전이.
   *
   * 녹음 파일 S3 업로드는 OpenVidu 웹훅 이후 비동기로 진행되므로 이 응답이
   * 왔다고 파일이 준비된 것은 아니다. summaryStatus 로 추적한다.
   */
  async function endConsultation(
    consultationId: number,
    session: ConsultationSession | null,
  ): Promise<EndResult> {
    if (BACKEND_READY.CONSULTATION_END) {
      const res = await api.post<ApiResponse<EndResult>>(
        endpoints.admin.end(consultationId),
      )
      return res.data.data
    }

    const sessionId = session?.sessionId ?? toSessionId(consultationId)
    const recordingId = session?.recordingId ?? null

    /*
      recordingId 를 모르면 /end 를 부를 수 없다. 서버가 그 값을 필수로 받고
      DB 에 저장하지도 않아서(consultations 에 recording_id 컬럼 없음) 새로고침
      후에는 되찾을 방법이 없다. 세션만 닫으면 OpenVidu 가 녹음을 마감하고
      웹훅을 보내므로 파일 자체는 보존된다.
      TODO: recording_id 컬럼이 추가되면 이 분기를 지운다.
    */
    if (recordingId === null) {
      await closeSession(sessionId)
    } else {
      await api.post(endpoints.openvidu.endConsultation(sessionId), {
        recordingId,
      })
    }

    return {
      consultationId,
      status: 'ENDED',
      durationSec: null,
      summaryStatus: 'PENDING',
    }
  }

  return {
    openSession,
    joinSession,
    issueToken,
    fetchSnapshot,
    requestConsultation,
    endConsultation,
    closeSession,
  }
}

export type OpenViduApi = ReturnType<typeof createOpenViduApi>
