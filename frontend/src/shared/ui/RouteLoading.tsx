import { AppLogo } from '@/shared/ui/AppLogo'

export interface RouteLoadingProps {
  /** 기본값은 관리자 진입 기준 문구다. 다른 곳에서 쓰면 상황에 맞게 넘긴다. */
  message?: string
}

/**
 * 라우트 전환 대기 화면 (Suspense fallback).
 *
 * lazy 로 분리한 청크를 받는 동안 보인다. 현재는 admin 청크(약 240KB)가
 * 유일한 대상이라 문구를 한국어로 고정했다. (관리자 화면 기준과 동일)
 *
 * 기존 LoadingOverlay 와 용도가 다르다. 그쪽은 화면 위를 덮는 반투명 오버레이로
 * AI 분석·상담 연결 대기에 쓰이고, 이쪽은 아직 아무것도 렌더되지 않은 상태에서
 * 화면 전체를 채운다. 그래서 배경이 불투명하고 로고를 함께 보여준다.
 */
export function RouteLoading({
  message = '화면을 불러오는 중입니다',
}: RouteLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-surface flex min-h-[100dvh] flex-col items-center justify-center gap-6"
    >
      <AppLogo size="clamp(56px,14vw,72px)" />

      <span
        aria-hidden
        className="border-brand-soft border-t-brand size-9 animate-spin rounded-full border-4"
      />

      <p className="text-ink-muted px-8 text-center text-[13.5px] leading-5">
        {message}
      </p>
    </div>
  )
}
