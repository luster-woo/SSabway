import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import { Button, CheckIcon, ChevronLeftIcon, MobileScreen } from '@/shared/ui'
import { ArrivalSummaryCard } from '@/user/features/arrival/ArrivalSummaryCard'
import { toArrivalSummary } from '@/user/features/arrival/lib/toArrivalSummary'
import { useGuideInfo } from '@/user/features/user-info/useGuideInfo'

/**
 * 6-1. 도착 완료 — 안내가 끝난 뒤 이동을 정리하는 화면.
 *
 * 이동 요약을 보여주고 새 목적지 안내로 이어준다. 요약 값은 앞선 화면들의
 * 선택(경로 선택 결과 + 고른 목적지)이라 서버에 다시 묻지 않고 스토어에서
 * 꺼낸다 — toArrivalSummary 참고.
 */
export default function ArrivalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const selectedRoute = useSelectedRouteStore((state) => state.selectedRoute)
  const { info } = useGuideInfo()
  const summary = toArrivalSummary(selectedRoute, info)
  // 환승이 있으면 하차역에서 표지판을 다시 찍어 이어서 안내받아야 한다.
  const isTransfer = (selectedRoute?.transferCount ?? 0) > 0

  const startNewGuide = () => {
    void navigate('/scan')
  }

  return (
    <MobileScreen
      header={
        <button
          type="button"
          aria-label={t('arrival.back')}
          onClick={() => void navigate(-1)}
          className="text-ink -ml-1.5 flex size-8 items-center justify-center rounded-full"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
      }
      footer={
        <Button size="lg" fullWidth onClick={startNewGuide}>
          {t('arrival.newDestination')}
        </Button>
      }
    >
      {/*
        경로를 고르지 않은 채 이 화면에 들어온 경우(URL 직접 진입, 세션 만료).
        비어 있는 요약을 "0분 · - → -" 로 그리면 안내가 실패한 것처럼 보인다.
      */}
      {!summary ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('arrival.noSummary')}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-7 pt-8 pb-2">
          {/* 도착 축하 — 연한 원 위에 그라디언트 체크 원을 겹친다. */}
          <div className="flex flex-col items-center gap-5 pt-4 text-center">
            <span className="bg-brand-soft flex size-[124px] items-center justify-center rounded-full">
              <span
                aria-hidden
                className="bg-brand-gradient flex size-20 items-center justify-center rounded-full text-white"
              >
                <CheckIcon className="size-10" strokeWidth={2.6} />
              </span>
            </span>

            <h1 className="text-ink text-[clamp(20px,6vw,22px)] leading-tight font-extrabold">
              {t('arrival.title')}
            </h1>
          </div>

          {/* 카드 묶음을 살짝 내려 제목과 간격을 둔다(mt-3). */}
          <div className="mt-3">
            <ArrivalSummaryCard summary={summary} />
          </div>

          {/*
            환승 안내 — 하차역에서 내려 표지판을 다시 찍어야 다음 역 안내가
            이어진다. 카드 아래 남는 공간의 가운데쯤(my-auto)에 볼드로 강조한다.
            직통(환승 없음)이면 하차역이 곧 목적지라 감춘다.
          */}
          {isTransfer ? (
            <p
              role="status"
              className="text-ink-muted my-auto text-center text-[13px] leading-relaxed font-bold whitespace-pre-line"
            >
              {t('arrival.transferHint', { station: summary.alightStation })}
            </p>
          ) : null}
        </div>
      )}
    </MobileScreen>
  )
}
