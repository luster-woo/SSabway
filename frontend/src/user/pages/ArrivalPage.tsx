import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import { Button, CheckIcon, MobileScreen } from '@/shared/ui'
import { ArrivalSummaryCard } from '@/user/features/arrival/ArrivalSummaryCard'
import { toArrivalSummary } from '@/user/features/arrival/lib/toArrivalSummary'

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
  const destination = useDestinationStore((state) => state.destination)
  const summary = toArrivalSummary(selectedRoute, destination)

  const goToMain = () => {
    void navigate('/')
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
          <span aria-hidden className="text-2xl">
            ‹
          </span>
        </button>
      }
      footer={
        <Button size="lg" fullWidth onClick={goToMain}>
          {t('arrival.goMain')}
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

            <div className="flex flex-col gap-1.5">
              <h1 className="text-ink text-[clamp(20px,6vw,22px)] leading-tight font-extrabold">
                {t('arrival.title')}
              </h1>
              {/*
                크게는 도착역, 그 아래 작게 사용자가 고른 최종 목적지를 병기한다.
                역 자체를 목적지로 골랐으면 finalDestination 이 null 이라 한 줄만 남는다.
              */}
              <p className="text-ink text-[15px] font-bold">
                {summary.destinationStation}
              </p>
              {summary.finalDestination ? (
                <p className="text-ink-muted text-[13.5px]">
                  {t('arrival.finalDestination', {
                    name: summary.finalDestination,
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <ArrivalSummaryCard summary={summary} />
        </div>
      )}
    </MobileScreen>
  )
}
