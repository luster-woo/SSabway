import type { Language } from '@/shared/types/user'

/**
 * 사용법 안내 모달의 한 페이지.
 *
 * 애니메이션 안에 이미 문구가 그려져 있어(언어별로 파일이 다른 이유다) 화면에서
 * 설명을 덧붙이지 않는다. 여기 있는 문구는 스크린리더용 대체 텍스트뿐이다.
 */
export interface TutorialStep {
  /** i18n 키 조각. `start.tutorial.steps.{id}` */
  id: 'signs' | 'photoGuide' | 'videoCall'
  /** `public/tutorial/{lang}/{file}.webp` */
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
  { id: 'signs', file: 'signs', width: 640, height: 262 },
  { id: 'photoGuide', file: 'photo-guide', width: 640, height: 330 },
  { id: 'videoCall', file: 'video-call', width: 640, height: 474 },
]

/**
 * GIF 영역 높이를 폭의 몇 %로 둘지 — `padding-bottom` 에 넣는다.
 *
 * **세 페이지가 같은 값을 쓴다.** 페이지마다 비율을 따라가게 하면 넘길 때마다
 * 팝업 전체가 늘었다 줄었다 해서, 크기를 하나로 통일했다(8/5 팀 의견).
 *
 * 값은 콘텐츠 비율들의 **기하평균**이다 — √(2.443 × 1.350) ≒ 1.816, 즉 1/1.816
 * ≒ 55%. 왜 기하평균인가:
 *
 *   - 콘텐츠가 박스보다 납작하면(signs 2.443, photoGuide 1.939) 폭을 꽉 채우고
 *     위아래가 빈다. 이때 **콘텐츠 크기는 박스 높이와 무관하다** — 박스를 키워도
 *     그림은 그대로고 흰 여백만 늘어난다.
 *   - 콘텐츠가 박스보다 길쭉하면(videoCall 1.350) 높이에 맞춰지므로 박스를
 *     납작하게 할수록 **그림이 작아진다.**
 *
 * 그래서 박스를 납작하게 = signs 여백↓ · videoCall 그림↓, 길쭉하게 = 그 반대다.
 * 기하평균이 양극단(2.443 · 1.350)의 여백을 정확히 같게 만든다:
 *
 *   photoGuide  358×185  빈 여백  6.3%  (위아래 6px)
 *   signs       358×147  빈 여백 25.6%  (위아래 25px)
 *   videoCall   266×197  빈 여백 25.7%  (좌우 46px)
 *
 * 여백이 한쪽으로 치우치지 않도록 `object-contain` + 가운데 정렬로 양쪽에 똑같이
 * 나눈다. GIF 배경이 순백(#fff)이고 박스도 흰색이라 이 여백은 눈에 보이지 않는다
 * — 회색 배경(surface-soft)을 쓰면 남는 자리가 띠로 드러나므로 쓰지 말 것.
 */
export const TUTORIAL_MEDIA_PADDING_BOTTOM = '55%'

/**
 * 애니메이션 주소. `public/` 아래의 정적 파일이라 모달을 열 때 처음 내려온다.
 *
 * ⚠️ 포맷은 애니메이션 webp 다 — GIF 는 반복 재생이 멈추지 않아 사진이 다
 * 나온 뒤에도 계속 돌았다. webp 는 ANIM 청크의 루프 횟수를 1 로 박아
 * **한 번 재생하고 마지막 프레임에서 멈춘다.** 에셋을 다시 만들면 루프
 * 횟수를 반드시 1 로 인코딩할 것 (public/tutorial/README.md 참고).
 */
export function toTutorialMediaUrl(step: TutorialStep, lang: Language): string {
  return `/tutorial/${lang}/${step.file}.webp`
}

/** 한 번 받은 파일은 세션 동안 다시 받지 않는다. 실패한 요청은 남기지 않는다. */
const mediaBlobCache = new Map<string, Promise<Blob>>()

/**
 * 애니메이션 파일을 blob 으로 받는다 — **다시 열면 처음부터 재생시키기 위해서다.**
 *
 * 루프 1회짜리 애니메이션은 브라우저가 "이 주소는 이미 끝까지 재생됨" 상태를
 * 세션 내내 기억한다. 같은 주소로 모달을 다시 열면 마지막 프레임에 멈춘 채로
 * 뜬다. 열 때마다 이 blob 으로 **새 objectURL** 을 만들면 브라우저에게는 새
 * 리소스라 처음부터 재생된다. blob 은 여기 캐시에 남으므로 네트워크는 처음
 * 한 번만 탄다 (지하 약전파 구간 고려 — 주소에 난수를 붙이는 방식은 매번
 * 다시 내려받아서 쓰지 않았다).
 */
export function fetchTutorialMediaBlob(url: string): Promise<Blob> {
  let pending = mediaBlobCache.get(url)
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`tutorial media ${response.status}`)
      return response.blob()
    })
    // 실패(오프라인 등)를 캐시에 남기면 재시도가 영영 막힌다.
    pending.catch(() => mediaBlobCache.delete(url))
    mediaBlobCache.set(url, pending)
  }
  return pending
}
