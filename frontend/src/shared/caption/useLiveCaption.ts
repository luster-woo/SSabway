import { useEffect, useRef, useState } from 'react'

import { createMockCaptionTransport } from '@/shared/caption/mockTransport'
import {
  startPcmStreamer,
  type PcmStreamerHandle,
} from '@/shared/caption/pcmStreamer'
import type {
  CaptionEvent,
  CaptionSpeaker,
  CaptionTransport,
} from '@/shared/caption/types'
import { createWsCaptionTransport } from '@/shared/caption/wsTransport'
import { env, IS_DEV } from '@/shared/lib/env'
import type { Language } from '@/shared/types/user'

/**
 * 앱의 Language → 명세의 BCP-47 코드.
 * 명세 예시가 'en-US'/'ko-KR' 형식이라 여기서 한 번만 변환한다.
 */
const LOCALES: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
}

/** 화면에 유지할 확정 자막 줄 수. 대화 로그가 아니라 자막이므로 짧게 둔다. */
const MAX_LINES = 2
/** INTERIM 이 이 시간 동안 갱신 없으면 지운다 */
const PARTIAL_TTL_MS = 5_000
/** 확정 자막도 대화가 멈추면 치운다 — 화면을 계속 가리지 않게 */
const LINES_TTL_MS = 8_000

export interface LiveCaptionOptions {
  /** 원격 화자가 누구인지. 관리자 화면이면 'USER', 사용자 화면이면 'ADMIN' */
  speaker: CaptionSpeaker
  /**
   * 화자(상대)의 언어.
   * 관리자 화면 → 상담 정보의 사용자 language / 사용자 화면 → 'ko' 고정
   */
  sourceLang: Language
  /** 내가 볼 언어. 관리자 화면 → 'ko' 고정 / 사용자 화면 → useLanguage() */
  targetLang: Language
}

export interface LiveCaptionState {
  /** 확정(FINAL)된 최근 자막 (오래된 것부터) */
  lines: string[]
  /** 말하는 중(INTERIM)인 문장. 없으면 null */
  partial: string | null
  /**
   * idle      아직 시작 전이거나 stream/enabled 없음
   * listening 오디오 추출이 돌고 있음 (자막이 안 와도 이 상태일 수 있다)
   * error     오디오 추출 실패 또는 소켓 재연결 포기
   */
  status: 'idle' | 'listening' | 'error'
}

/**
 * 상대방 원격 오디오 → AI 번역 자막.
 * 명세: Notion API 명세서 > AI > 실시간 번역 자막 생성 (/ws/v1/ai/translation)
 *
 * "듣는 쪽이 자기 언어로 번역해 받는다" 구조다. stream 은 OpenVidu
 * subscriber 의 MediaStream: remoteStream.stream.getMediaStream()
 *
 * 자막 실패는 상담을 막지 않는다 — status 만 'error' 로 두고 조용히 끝낸다.
 * 통화 자체는 OpenVidu 가 이미 배달하고 있으므로 여기서 던지면 안 된다.
 */
export function useLiveCaption(
  stream: MediaStream | null,
  options: LiveCaptionOptions,
  enabled = true,
  /**
   * 문장이 확정될 때마다 부른다. 화면은 최근 몇 줄만 남기고 지우므로
   * (MAX_LINES · LINES_TTL_MS) 대화 전체가 필요한 쪽은 여기서 받아 모은다.
   * 상담 요약이 이걸 쓴다.
   */
  onFinal?: (event: CaptionEvent) => void,
): LiveCaptionState {
  const { speaker, sourceLang, targetLang } = options

  const [lines, setLines] = useState<string[]>([])
  const [partial, setPartial] = useState<string | null>(null)
  const [status, setStatus] = useState<LiveCaptionState['status']>('idle')

  // 타이머를 ref 로 들고 있어야 이벤트마다 이전 예약을 취소할 수 있다
  const partialTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const linesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /*
    콜백을 의존성에 넣으면 안 된다. 호출부가 인라인 함수를 넘기면 렌더마다
    참조가 바뀌어 소켓이 계속 끊겼다 붙는다. 연결을 다시 맺을지는 stream 과
    설정만 정한다. (useOpenViduSession 의 publishRef 와 같은 이유)
  */
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(() => {
    if (!stream || !enabled) {
      setStatus('idle')
      setLines([])
      setPartial(null)
      return
    }

    let cancelled = false
    let streamer: PcmStreamerHandle | null = null

    const config = {
      speaker,
      sourceLanguage: LOCALES[sourceLang],
      targetLanguage: LOCALES[targetLang],
    }

    // 다른 목들과 같은 스위치. MSW 는 WebSocket 을 못 가로채므로
    // 자막 목은 핸들러가 아니라 transport 교체로 구현돼 있다.
    const transport: CaptionTransport =
      IS_DEV && env.USE_MSW
        ? createMockCaptionTransport(config)
        : createWsCaptionTransport(config)

    transport.start(
      (event) => {
        if (event.final) {
          onFinalRef.current?.(event)
          setLines((prev) => [...prev, event.text].slice(-MAX_LINES))
          setPartial(null)
          if (partialTimer.current) clearTimeout(partialTimer.current)
          if (linesTimer.current) clearTimeout(linesTimer.current)
          linesTimer.current = setTimeout(() => setLines([]), LINES_TTL_MS)
        } else {
          setPartial(event.text)
          if (partialTimer.current) clearTimeout(partialTimer.current)
          partialTimer.current = setTimeout(
            () => setPartial(null),
            PARTIAL_TTL_MS,
          )
        }
      },
      () => setStatus('error'),
    )

    startPcmStreamer(stream, (pcm) => transport.sendChunk(pcm))
      .then((handle) => {
        if (cancelled) {
          handle.stop()
          return
        }
        streamer = handle
        setStatus('listening')
      })
      .catch(() => setStatus('error'))

    return () => {
      cancelled = true
      if (partialTimer.current) clearTimeout(partialTimer.current)
      if (linesTimer.current) clearTimeout(linesTimer.current)
      streamer?.stop()
      transport.stop()
      setLines([])
      setPartial(null)
      setStatus('idle')
    }
  }, [stream, enabled, speaker, sourceLang, targetLang])

  return { lines, partial, status }
}
