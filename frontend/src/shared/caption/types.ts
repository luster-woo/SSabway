/**
 * 실시간 번역 자막 — 타입.
 * 명세: Notion API 명세서 > AI > 실시간 번역 자막 생성 (/ws/v1/ai/translation)
 */

export type CaptionSpeaker = 'USER' | 'ADMIN'

/**
 * 연결 직후 첫 메시지로 보내는 세션 설정 (명세의 Request Body).
 * 언어는 BCP-47 형식이다 — 앱의 Language('ko'…)와 다르므로
 * useLiveCaption 의 LOCALES 맵이 변환한다.
 */
export interface CaptionSessionConfig {
  /** 지금 말하는 쪽(원격 화자). 관리자 화면이 듣는 상대는 USER 다 */
  speaker: CaptionSpeaker
  /** 화자의 언어 (예: 'en-US') */
  sourceLanguage: string
  /** 번역해 받을 언어 (예: 'ko-KR') */
  targetLanguage: string
}

/** 서버 응답을 화면용으로 줄인 것 */
export interface CaptionEvent {
  /** translatedText — 내 언어로 번역된 자막 */
  text: string
  /** type === 'FINAL'. INTERIM 은 다음 이벤트로 대체되는 진행분이다 */
  final: boolean
  /** sourceText — 음성 인식 원문. 원문 병기 UI 를 붙일 때 쓴다 */
  sourceText?: string
  /** sourceLanguage */
  sourceLang?: string
}

/**
 * 오디오 조각을 보내고 자막을 받는 통로.
 * 실제 구현(wsTransport)과 개발용 목(mockTransport)이 이 모양을 공유한다.
 */
export interface CaptionTransport {
  start(
    onEvent: (event: CaptionEvent) => void,
    onError?: (error: Error) => void,
  ): void
  /**
   * 16kHz mono PCM16 한 조각 (pcmStreamer 가 만든다).
   * 연결 전이거나 끊긴 동안은 조용히 버린다 — 자막은 흘러가는 정보라
   * 몇 초 유실보다 밀린 오디오가 한꺼번에 번역되는 쪽이 더 이상하다.
   */
  sendChunk(pcm: Int16Array<ArrayBuffer>): void
  stop(): void
}
