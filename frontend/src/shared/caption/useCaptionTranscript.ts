import { useCallback, useRef } from 'react'

import type { CaptionEvent, CaptionSpeaker } from '@/shared/caption/types'

/**
 * 상담 자막을 대화 순서대로 모은다. 상담 종료 후 GMS 요약에 쓴다.
 * (POST /api/v1/consultations/{id}/summary)
 *
 * 화면용 자막(useLiveCaption 의 lines)은 최근 두 줄만 남기고 8초 뒤 지우므로
 * 대화 전체를 만들 수 없다. 그래서 확정 문장을 여기로 따로 받는다.
 *
 * state 가 아니라 ref 에 쌓는 이유 —
 * 이 값은 화면에 그리지 않고 종료 시점에 한 번만 읽는다. state 로 두면 문장이
 * 확정될 때마다 통화 화면 전체가 다시 렌더된다.
 */

/** 백엔드 제약 (ConsultationSummaryRequest · TranscriptItem) */
const MAX_ITEMS = 200
const MAX_TEXT_LENGTH = 100

/** 요약 요청에 실어 보내는 한 문장 */
export interface TranscriptItem {
  speaker: 'USER' | 'STAFF'
  text: string
}

export interface CaptionTranscript {
  /** 역무원 발화 자막을 받는다 (useLiveCaption 의 onFinal 로 넘길 것) */
  addStaffLine: (event: CaptionEvent) => void
  /** 사용자 발화 자막을 받는다 */
  addUserLine: (event: CaptionEvent) => void
  /** 지금까지 모인 전문. 종료 시 한 번 읽는다 */
  snapshot: () => TranscriptItem[]
  clear: () => void
}

/**
 * 어느 필드가 한국어인지는 소켓 설정에 달려 있다.
 *
 *   역무원 발화 : ko → 사용자 언어  이므로 sourceText 가 한국어 원문
 *   사용자 발화 : 사용자 언어 → ko  이므로 translatedText 가 한국어
 *
 * 요약은 역무원이 대시보드에서 읽으므로 한국어로 통일한다.
 * (사용자 언어가 한국어면 어느 쪽을 써도 한국어라 그대로 동작한다)
 */
function toKorean(event: CaptionEvent, speaker: CaptionSpeaker): string {
  const text = speaker === 'ADMIN' ? (event.sourceText ?? event.text) : event.text
  return text.trim().slice(0, MAX_TEXT_LENGTH)
}

export function useCaptionTranscript(): CaptionTranscript {
  const itemsRef = useRef<TranscriptItem[]>([])

  const push = useCallback((speaker: TranscriptItem['speaker'], text: string) => {
    if (!text) return
    itemsRef.current.push({ speaker, text })
    /*
      오래된 것부터 버린다. 요약은 후반부 대화가 더 중요하고, 뒤를 자르면
      결론이 사라진다. 서버도 200개를 넘기면 400 을 준다.
    */
    if (itemsRef.current.length > MAX_ITEMS) {
      itemsRef.current = itemsRef.current.slice(-MAX_ITEMS)
    }
  }, [])

  return {
    addStaffLine: useCallback(
      (event) => {
        push('STAFF', toKorean(event, 'ADMIN'))
      },
      [push],
    ),
    addUserLine: useCallback(
      (event) => {
        push('USER', toKorean(event, 'USER'))
      },
      [push],
    ),
    snapshot: useCallback(() => [...itemsRef.current], []),
    clear: useCallback(() => {
      itemsRef.current = []
    }, []),
  }
}
