import type {
  CaptionEvent,
  CaptionSessionConfig,
  CaptionTransport,
} from '@/shared/caption/types'

/**
 * AI 연동 전 개발용 가짜 자막.
 *
 * MSW 는 HTTP 만 가로채고 WebSocket 은 다루지 않으므로, 자막은 핸들러가
 * 아니라 transport 교체로 목을 만든다. 선택은 useLiveCaption 이
 * `IS_DEV && env.USE_MSW` 로 한다 — 다른 목들과 같은 스위치를 따른다.
 *
 * 오디오 조각(320ms)이 흘러드는 동안에만 자막을 낸다. 조각 5개째에
 * INTERIM, 10개째(≈3.2초)에 FINAL 을 내보내 실제 리듬을 흉내낸다.
 */

const PHRASES: Record<string, string[]> = {
  'ko-KR': [
    '안녕하세요, 무엇을 도와드릴까요?',
    '3번 출구는 오른쪽 계단으로 올라가시면 됩니다.',
    '엘리베이터는 개찰구를 지나 왼쪽에 있어요.',
  ],
  'en-US': [
    'Hello, how can I help you?',
    'For exit 3, take the stairs on your right.',
    'The elevator is on the left, past the gates.',
  ],
  'ja-JP': [
    'こんにちは、ご用件をどうぞ。',
    '3番出口は右側の階段を上がってください。',
    'エレベーターは改札を出て左側です。',
  ],
  'zh-CN': [
    '您好，请问需要什么帮助？',
    '3号出口请走右边的楼梯。',
    '电梯在检票口过去的左边。',
  ],
}

export function createMockCaptionTransport(
  config: CaptionSessionConfig,
): CaptionTransport {
  let emit: ((event: CaptionEvent) => void) | null = null
  let chunks = 0
  let phraseIndex = 0

  const list = PHRASES[config.targetLanguage] ?? PHRASES['ko-KR']

  return {
    start(onEvent) {
      emit = onEvent
    },
    sendChunk() {
      if (!emit) return
      chunks += 1
      const phrase = list[phraseIndex % list.length]
      if (chunks % 10 === 5) {
        emit({
          text: phrase.slice(0, Math.ceil(phrase.length / 2)) + '…',
          final: false,
        })
      }
      if (chunks % 10 === 0) {
        emit({
          text: phrase,
          final: true,
          sourceText: '(mock source)',
          sourceLang: config.sourceLanguage,
        })
        phraseIndex += 1
      }
    },
    stop() {
      emit = null
    },
  }
}
