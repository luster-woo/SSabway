import { useCallback, useEffect, useRef, useState } from 'react'
import {
  OpenVidu,
  OpenViduError,
  OpenViduErrorName,
  type Publisher,
  type Session,
  type StreamEvent,
  type StreamManager,
} from 'openvidu-browser'

/**
 * OpenVidu v2 세션 연결.
 *
 * 발급받은 토큰 하나로 접속·발행·구독을 끝낸다. 시그널링(OFFER/ANSWER/ICE)은
 * OpenVidu 가 처리하므로 여기서 다루지 않는다.
 *
 * 사용자 앱과 관리자 앱이 같은 흐름을 쓰므로 shared 에 둔다.
 * 발행 내용만 다르다 — 사용자는 후면 카메라 + 마이크, 역무원은 마이크만.
 */

export const OV_STATUS = {
  /** 토큰이 아직 없다 */
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  /** 네트워크가 끊겨 OpenVidu 가 자동 복구를 시도하는 중 */
  RECONNECTING: 'RECONNECTING',
  /** 정상 종료됐거나 상대가 세션을 닫았다 */
  DISCONNECTED: 'DISCONNECTED',
  FAILED: 'FAILED',
} as const

export type OpenViduStatus = (typeof OV_STATUS)[keyof typeof OV_STATUS]

/**
 * FAILED 의 원인. 화면이 분기해야 하는 경우만 구분한다.
 *
 * 마이크·카메라 문제와 그 밖의 실패(접속 실패·네트워크 등)를 가르는 것이
 * 목적이다 — 장치 문제는 상담을 취소해야 하지만 나머지는 재시도할 여지가 있다.
 */
export const OV_FAILURE = {
  /** 권한 팝업에서 거부했거나, 브라우저에 "차단"이 저장돼 있다 */
  DEVICE_DENIED: 'DEVICE_DENIED',
  /** 장치가 없거나 다른 앱이 점유 중이다 */
  DEVICE_UNAVAILABLE: 'DEVICE_UNAVAILABLE',
  /** 그 밖의 실패 — 접속 실패, 네트워크, 서버 오류 */
  OTHER: 'OTHER',
} as const

export type OpenViduFailure = (typeof OV_FAILURE)[keyof typeof OV_FAILURE]

/**
 * 실패 원인 분류.
 *
 * ⚠️ openvidu-browser 의 `OpenViduError` 는 **Error 를 상속하지 않는다**
 *    (`OpenViduInternal/Enums/OpenViduError.d.ts` 의 독립 class 선언).
 *    그래서 `instanceof Error` 로 거르면 원인이 통째로 사라진다 — 이 훅은
 *    그동안 마이크 거부를 `new Error(String(caught))`, 즉
 *    "[object Object]" 로 뭉개고 있었다.
 */
function classifyFailure(caught: unknown): OpenViduFailure {
  if (!(caught instanceof OpenViduError)) return OV_FAILURE.OTHER

  switch (caught.name) {
    case OpenViduErrorName.DEVICE_ACCESS_DENIED:
      return OV_FAILURE.DEVICE_DENIED
    case OpenViduErrorName.DEVICE_ALREADY_IN_USE:
    case OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND:
    case OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND:
    case OpenViduErrorName.INPUT_AUDIO_DEVICE_GENERIC_ERROR:
      return OV_FAILURE.DEVICE_UNAVAILABLE
    default:
      return OV_FAILURE.OTHER
  }
}

/** 로그용 Error. OpenViduError 는 Error 가 아니라 내용을 옮겨 담는다. */
function toError(caught: unknown): Error {
  if (caught instanceof Error) return caught

  if (caught instanceof OpenViduError) {
    const error = new Error(caught.message)
    error.name = caught.name
    return error
  }

  return new Error(String(caught))
}

export interface PublishConfig {
  /**
   * 직접 만든 스트림. 넘기지 않으면 OpenVidu 가 기본 장치를 연다.
   *
   * 사용자 화면은 권한 안내 모달을 먼저 띄우려고 getUserMedia 를 직접 부르므로
   * 그 스트림을 넘긴다. 여기서 또 열면 권한 팝업이 두 번 뜬다.
   */
  stream?: MediaStream | null
  audio: boolean
  video: boolean
}

export interface UseOpenViduSessionOptions {
  /** null 이면 접속하지 않는다. 값이 생기는 순간 연결을 시작한다. */
  token: string | null
  /** null 이면 구독만 한다 */
  publish?: PublishConfig | null
}

export interface UseOpenViduSessionResult {
  status: OpenViduStatus
  /** 사용자에게 보여줄 오류 문구가 아니라 로그용 원인 */
  error: Error | null
  /** FAILED 의 원인. 그 밖의 상태에서는 null */
  failure: OpenViduFailure | null
  /**
   * 접속이 끝난 세션. 끊겨 있으면 null.
   *
   * 연결·발행·구독은 이 훅이 이미 끝내 두므로, 호출부가 이걸 쓸 일은
   * 그 밖의 세션 기능(시그널 등)뿐이다 — 예: useViewportAspect 가 사용자
   * 화면 비율을 역무원 쪽으로 보낸다.
   *
   * ref 가 아니라 state 로 내보낸다. 값이 생기는 순간 호출부의 effect 가
   * 깨어나야 리스너를 붙일 수 있는데, ref 변경은 렌더를 일으키지 않는다.
   */
  session: Session | null
  publisher: Publisher | null
  subscribers: StreamManager[]
  /** 1:1 통화라 화면은 보통 이것만 쓴다 */
  remoteStream: StreamManager | null
  /** 화면의 [종료] 버튼이 부른다. 언마운트 시에는 자동으로 정리된다. */
  leave: () => void
}

/** 트랙이 없으면 undefined 를 줘서 OpenVidu 가 장치를 직접 열게 한다 */
function toSource(
  track: MediaStreamTrack | undefined,
  enabled: boolean,
): MediaStreamTrack | boolean | undefined {
  if (!enabled) return false
  return track ?? undefined
}

export function useOpenViduSession(
  options: UseOpenViduSessionOptions,
): UseOpenViduSessionResult {
  const { token, publish } = options

  const [status, setStatus] = useState<OpenViduStatus>(OV_STATUS.IDLE)
  const [error, setError] = useState<Error | null>(null)
  const [failure, setFailure] = useState<OpenViduFailure | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [subscribers, setSubscribers] = useState<StreamManager[]>([])

  const sessionRef = useRef<Session | null>(null)

  /**
   * publish 설정을 ref 로 들고 있는 이유.
   *
   * 호출부가 객체 리터럴을 넘기면 매 렌더마다 참조가 바뀐다. 이걸 effect 의존성에
   * 넣으면 렌더마다 재접속이 일어난다. 연결을 다시 맺을지는 오직 token 이 정한다.
   */
  const publishRef = useRef(publish)
  publishRef.current = publish

  const leave = useCallback(() => {
    sessionRef.current?.disconnect()
    sessionRef.current = null
    setSession(null)
    setPublisher(null)
    setSubscribers([])
    setFailure(null)
    setStatus(OV_STATUS.DISCONNECTED)
  }, [])

  useEffect(() => {
    if (!token) {
      setFailure(null)
      setStatus(OV_STATUS.IDLE)
      return
    }

    /*
      아래 connect 는 함수 선언문이라 호이스팅된다. TypeScript 는 호이스팅된
      함수 안에서는 바깥 변수의 좁혀진 타입(여기서는 token: string)을 보장하지
      못하므로, 가드를 통과한 값을 지역 상수로 한 번 받아 넘긴다.
    */
    const connectToken = token

    // StrictMode 이중 마운트에서 먼저 뜬 세션의 뒤늦은 콜백을 버리기 위한 표식
    let isCurrent = true

    const ov = new OpenVidu()
    const session = ov.initSession()
    sessionRef.current = session

    session.on('streamCreated', (event) => {
      const subscriber = session.subscribe(
        (event as StreamEvent).stream,
        undefined,
      )
      if (!isCurrent) return
      setSubscribers((prev) => [...prev, subscriber])
    })

    session.on('streamDestroyed', (event) => {
      const destroyed = (event as StreamEvent).stream.streamManager
      if (!isCurrent) return
      setSubscribers((prev) => prev.filter((item) => item !== destroyed))
    })

    // 자동 복구 중. 명세의 유예 시간(사용자 60초 / 역무원 30초)은 서버가 센다.
    session.on('reconnecting', () => {
      if (!isCurrent) return
      setStatus(OV_STATUS.RECONNECTING)
    })

    session.on('reconnected', () => {
      if (!isCurrent) return
      setStatus(OV_STATUS.CONNECTED)
    })

    // 상대가 끊었거나 서버가 세션을 닫았다
    session.on('sessionDisconnected', () => {
      if (!isCurrent) return
      sessionRef.current = null
      setSession(null)
      setPublisher(null)
      setSubscribers([])
      setStatus(OV_STATUS.DISCONNECTED)
    })

    async function connect() {
      setStatus(OV_STATUS.CONNECTING)
      setError(null)
      setFailure(null)

      try {
        await session.connect(connectToken)
        if (!isCurrent) return

        const config = publishRef.current
        if (config) {
          const created = await ov.initPublisherAsync(undefined, {
            audioSource: toSource(
              config.stream?.getAudioTracks()[0],
              config.audio,
            ),
            videoSource: toSource(
              config.stream?.getVideoTracks()[0],
              config.video,
            ),
            publishAudio: config.audio,
            publishVideo: config.video,
            mirror: false,
          })
          if (!isCurrent) return

          await session.publish(created)
          if (!isCurrent) return
          setPublisher(created)
        }

        setSession(session)
        setStatus(OV_STATUS.CONNECTED)
      } catch (caught) {
        if (!isCurrent) return
        setError(toError(caught))
        setFailure(classifyFailure(caught))
        setStatus(OV_STATUS.FAILED)
      }
    }

    void connect()

    return () => {
      isCurrent = false
      session.disconnect()
      sessionRef.current = null
      setSession(null)
      setPublisher(null)
      setSubscribers([])
    }
  }, [token])

  return {
    status,
    error,
    failure,
    session,
    publisher,
    subscribers,
    remoteStream: subscribers[0] ?? null,
    leave,
  }
}
