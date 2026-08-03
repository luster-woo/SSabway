import axios, { type AxiosInstance } from 'axios'

import { endpoints } from '@/shared/api/endpoints'
import {
  CONSULTATION_STATUS,
  type ApiResponse,
  type ConsultationSession,
  type ConsultationSnapshot,
  type ConsultationStatus,
  type EndResult,
  type WebrtcApiResponse,
} from '@/shared/types'

/**
 * 화상 상담 서버(ssabway_webrtc) 호출부. — 8/3 백엔드 최신화 반영
 *
 * 서버 흐름: 역무원 accept(세션 생성+토큰 통합) / 사용자 connections(토큰)
 *            → start(녹음+IN_PROGRESS) → end.
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
 * 역무원은 accept 응답의 sessionId 를 받지만, 사용자 joinSession 과
 * 종료(endConsultation)는 sessionId 기준 API 라 이 규칙이 계속 필요하다.
 * 서버에서 접두사를 바꾸면 반드시 상호 공지할 것.
 */
const SESSION_ID_PREFIX = 'consultation-'

export function toSessionId(consultationId: number): string {
  return `${SESSION_ID_PREFIX}${String(consultationId)}`
}

/** BE 실제 DTO (ConsultationAcceptResponse — 8/3 코드 확인) */
interface ConsultationAccepted {
  consultationId: number
  sessionId: string
  token: string
  status: ConsultationStatus
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
  /**
   * 접속 토큰 발급 — 요청 본문이 없다.
   *
   * 참여자 ID 와 역할(USER/STAFF)은 서버가 JWT 에서 추출한다
   * (BE 8/2 권한 업데이트 — ConnectionCreateRequest 삭제됨).
   * 서버는 JWT 의 계정이 그 상담의 requester/staff 와 일치하는지
   * DB 와 대조하며, 남의 상담이면 403 FORBIDDEN 이 온다.
   */
  async function createConnection(
    sessionId: string,
  ): Promise<ConnectionCreated> {
    const res = await api.post<WebrtcApiResponse<ConnectionCreated>>(
      endpoints.openvidu.createConnection(sessionId),
    )
    return res.data.data
  }

  /**
   * 역무원이 상담을 수락할 때 — accept 1-call (BE 8/3 확정 구현).
   *
   * `POST /staffs/consultations/{id}/accept` 하나가 상태 잠금(WAITING→MATCHED)
   * + 세션 생성 + 역무원 토큰 발급을 서버 트랜잭션으로 처리한다.
   * 예전 3-call(sessions → connections, 실패 시 DELETE 롤백)은 백엔드에서
   * 제거되어 더 이상 존재하지 않는다 — 롤백도 서버 책임이 됐다.
   *
   * 녹음은 여기서 시작하지 않는다 — start 가 사용자 접속 이후로 합의됐다.
   *
   * 실패 분기:
   *   409 CONSULTATION_ALREADY_ACCEPTED — 다른 역무원이 먼저 수락(선착순)
   *   403 CONSULTATION_ACCESS_DENIED — 이 상담에 배정된 역무원이 아님
   *       (⚠️ 현 BE 는 상담 생성 시 staffId 를 고정한다 — 3.2 정책 합의와 연동)
   */
  async function openSession(
    consultationId: number,
  ): Promise<ConsultationSession> {
    const res = await api.post<WebrtcApiResponse<ConsultationAccepted>>(
      endpoints.admin.accept(consultationId),
    )
    const { sessionId, token } = res.data.data
    return { consultationId, sessionId, token }
  }

  /**
   * 이미 열려 있는 세션에 접속할 때. 사용자(여행객)와, 새로고침한 역무원이 쓴다.
   *
   * 세션은 역무원이 수락해야 생기므로, 열릴 때까지(404) 3초 간격으로 재시도한다.
   * 상담 상태 조회 API(BACKEND_READY.CONSULTATION_STATUS)가 생기면 사용자 쪽은
   * 상태 폴링 → 1회 접속으로 바뀌고, 이 함수는 역무원 새로고침 복구용으로 남는다.
   *
   * 재접속은 서버가 처리한다 — 같은 계정(JWT)으로 다시 커넥션을 받으면
   * 서버가 이전 커넥션을 끊고 새로 발급한다. 같은 역할의 다른 계정이면 409,
   * 그 상담의 참여자가 아니면 403 (재시도하지 않고 실패로 떨어진다).
   */
  async function joinSession(
    consultationId: number,
    options: JoinSessionOptions = {},
  ): Promise<ConsultationSession> {
    const { signal, timeoutMs = JOIN_TIMEOUT_MS } = options
    const sessionId = toSessionId(consultationId)
    const deadline = Date.now() + timeoutMs

    for (;;) {
      try {
        const connection = await createConnection(sessionId)
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
    requestConsultation,
    fetchSnapshot,
    issueToken,
  }
}

export type OpenViduApi = ReturnType<typeof createOpenViduApi>
