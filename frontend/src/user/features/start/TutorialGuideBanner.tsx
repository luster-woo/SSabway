import { useTranslation } from 'react-i18next'

export interface TutorialGuideBannerProps {
  onOpen: () => void
}

function PlayIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M9 6.5v11a1 1 0 0 0 1.53.85l8-5.5a1 1 0 0 0 0-1.7l-8-5.5A1 1 0 0 0 9 6.5Z" />
    </svg>
  )
}

function ChevronRightIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/**
 * 시작 페이지의 사용법 안내 진입점 — 「안내 시작」 바로 위에 놓인다.
 *
 * 위치 권한을 고른 뒤 생기는 빈 공간을 채우면서, 사용자가 「안내 시작」 을
 * 누르기 전에 한 번 눈에 걸리도록 만든 카드다.
 *
 * ⚠️ 브랜드 그라디언트로 칠하지 않는다. 「안내 시작」 이 이미 그 그라디언트라,
 *    같은 색으로 하면 폭도 비슷한 파란 덩어리가 위아래로 두 개 붙어 어느 쪽이
 *    주 행동인지 사라진다(실제로 그렇게 만들어 보고 되돌렸다). 대신 옅은
 *    브랜드 배경(brand-soft)에 진한 글씨를 쓴다 — 흰 화면에서는 충분히 튀고,
 *    꽉 찬 CTA 옆에서는 "먼저 볼 수 있는 것"으로 읽힌다.
 *
 * 아이콘 원만 그라디언트로 채워 시선을 잡고, 그 뒤로 옅은 링을 천천히
 * 깜빡인다. 모션을 줄인 환경에서는 깜빡이지 않는다.
 *
 * 카드 전체가 버튼이다 — 폰에서 작은 텍스트 링크를 겨냥하게 만들지 않는다.
 */
export function TutorialGuideBanner({ onOpen }: TutorialGuideBannerProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onOpen}
      // 320px 기기에서 「안내 시작」 을 밀어내지 않도록 세로 여백도 폭에 맞춰 줄인다.
      className="bg-brand-soft border-brand/25 focus-visible:ring-brand relative flex w-full items-center gap-3 rounded-2xl border px-4 py-[clamp(10px,3vw,14px)] text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:brightness-95"
    >
      <span aria-hidden className="relative flex size-9 shrink-0">
        {/* 시선을 끄는 옅은 링. 아이콘 뒤에서 번진다. */}
        <span className="bg-brand/40 absolute -inset-1 animate-pulse rounded-full blur-[5px] motion-reduce:animate-none" />
        <span className="bg-brand-gradient relative flex size-9 items-center justify-center rounded-full">
          <PlayIcon className="size-4 translate-x-[1px] text-white" />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-brand block text-[clamp(11px,3.2vw,12px)] font-semibold">
          {t('start.tutorial.eyebrow')}
        </span>
        <span className="text-brand-dark mt-0.5 block text-[clamp(13.5px,4vw,15px)] leading-5 font-bold">
          {t('start.tutorial.bannerTitle')}
        </span>
      </span>

      <ChevronRightIcon className="text-brand size-5 shrink-0" />
    </button>
  )
}
