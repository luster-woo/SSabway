import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

export interface RouteNoticePopupProps {
  /** true 인 동안 보인다. 사라질 때도 페이드아웃이 걸리도록 언마운트하지 않는다. */
  show: boolean
  /** 사용자가 고른 목적지 이름 (예: "경북대 북문") */
  destinationName: string | null
  /** 안내가 끝나는 하차역. 선택된 경로 카드를 따라간다. */
  stationName: string | null
}

/**
 * 경로 로드 직후 화면 하단에 잠깐 떠오르는 안내 팝업.
 *
 * "지하철은 하차역까지만 안내하고, 그 뒤는 도보"라는 사실을 알린다.
 * 위치·크기는 공용 Toast(shared/ui/Toast)와 맞추되, 두 줄짜리 카드라
 * 알약형 대신 반투명 카드로 그린다. 노출 시간은 RoutePage 가 정한다(5초).
 */
export function RouteNoticePopup({
  show,
  destinationName,
  stationName,
}: RouteNoticePopupProps) {
  const { t } = useTranslation()

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-6',
        'bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]',
        'transition-all duration-500',
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      {destinationName && stationName ? (
        <div className="bg-ink/70 max-w-[360px] rounded-2xl px-5 py-3.5 text-center shadow-lg backdrop-blur-sm">
          <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-white">
            {t('route.select.pathIntro', {
              destination: destinationName,
              station: stationName,
            })}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/80">
            {t('route.select.walkNotice')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
