import type { Language } from '@/shared/types/user'

/**
 * 사용법 안내 모달의 한 페이지.
 *
 * GIF 안에 이미 문구가 그려져 있어(언어별로 파일이 다른 이유다) 화면에서 설명을
 * 덧붙이지 않는다. 여기 있는 문구는 스크린리더용 대체 텍스트뿐이다.
 */
export interface TutorialStep {
  /** i18n 키 조각. `start.tutorial.steps.{id}` */
  id: 'signs' | 'photoGuide' | 'videoCall'
  /** `public/tutorial/{lang}/{file}.gif` */
  file: string
  /** 원본 크기 — 이미지 자리를 미리 잡아 로딩 중 레이아웃이 튀지 않게 한다. */
  width: number
  height: number
}

/**
 * 페이지 순서. 1) 촬영 가이드 → 2) 표지판 안내 → 3) 화상 상담.
 *
 * 서비스 흐름과 같은 순서다 — 사용자는 먼저 표지판을 **찍고**(촬영 가이드),
 * 그 결과로 표지판을 이어가는 **안내**를 받고, 막히면 **화상 상담**을 건다.
 * (8/5 순서 변경: 처음엔 signs 가 먼저였는데 흐름상 촬영이 앞이라 바꿨다)
 *
 * 크기는 4개 언어 공통이다 — 원본을 다듬는 스크립트가 언어별 콘텐츠 영역의
 * 합집합으로 잘라내므로, 같은 페이지는 언어가 바뀌어도 같은 비율이다.
 */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'photoGuide', file: 'photo-guide', width: 640, height: 330 },
  { id: 'signs', file: 'signs', width: 640, height: 262 },
  { id: 'videoCall', file: 'video-call', width: 640, height: 474 },
]

/**
 * 미디어 영역 높이를 폭의 몇 %로 둘지 — `padding-bottom` 에 넣는 값.
 *
 * 세 페이지의 비율이 꽤 달라(2.44 · 1.94 · 1.35), 한 페이지에 맞춰 고정하면
 * 다른 페이지에서 위아래가 크게 빈다. 보고 있는 페이지의 비율을 그대로 쓰고
 * 높이를 부드럽게 바꾼다. `aspect-ratio` 는 브라우저마다 트랜지션이 되는지
 * 갈리므로, 폭 기준 퍼센트로 동작하고 어디서나 애니메이션되는
 * `padding-bottom` 을 쓴다.
 */
export function toMediaPaddingBottom(step: TutorialStep): string {
  return `${((step.height / step.width) * 100).toFixed(3)}%`
}

/** GIF 주소. `public/` 아래의 정적 파일이라 모달을 열 때 처음 내려온다. */
export function toTutorialGifUrl(step: TutorialStep, lang: Language): string {
  return `/tutorial/${lang}/${step.file}.gif`
}
