import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { GuideStep } from '@/shared/types/routeGuide'
import { Button, MobileScreen, SectionLabel, useToast } from '@/shared/ui'
import { GuideInstructionCard } from '@/user/features/route-guide/GuideInstructionCard'
import { HelpRequestButton } from '@/user/features/route-guide/HelpRequestButton'
import { RescanButton } from '@/user/features/route-guide/RescanButton'
import { SignBoardCard } from '@/user/features/route-guide/SignBoardCard'
import { StationLocationButton } from '@/user/features/route-guide/StationLocationButton'
import { StationMapOverlay } from '@/user/features/route-guide/StationMapOverlay'
import { StepNavigator } from '@/user/features/route-guide/StepNavigator'
import { StepProgressBar } from '@/user/features/route-guide/StepProgressBar'
import { ChevronLeftIcon } from '@/user/features/route-guide/icons'
import { useRouteGuide } from '@/user/features/route-guide/useRouteGuide'

/** 경로 재탐색을 마치고 돌아올 경로. SignCapturePage가 state로 받는다. */
const ROUTE_GUIDE_PATH = '/guide'

/** 마지막 단계에서 [다음]을 누르면 가는 곳 */
const ARRIVAL_PATH = '/arrival'

/**
 * 6. 경로 상세 안내 — 역 내 표지판을 한 장씩 보며 이동하는 화면.
 *
 * 한 화면에 한 단계만 보여준다. [이전]·[다음]으로 단계를 넘기고,
 * 안내와 눈앞 상황이 어긋나면 '경로 재탐색'으로 표지판 촬영 화면(2)에 다시 다녀온다.
 * 재탐색 후에는 이 화면으로 돌아오며 단계가 처음부터 다시 시작된다.
 */
export default function RouteGuidePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data, isPending, isError, refetch } = useRouteGuide()
  const steps = data?.steps ?? []
  const [activeIndex, setActiveIndex] = useState(0)

  // 재탐색으로 단계 수가 줄어들면 보고 있던 인덱스가 범위를 벗어나므로 되돌린다.
  // (매 refetch마다 0으로 리셋하면 안내 중 단계가 튄다)
  useEffect(() => {
    setActiveIndex((index) => (index < steps.length ? index : 0))
  }, [steps.length])

  // noUncheckedIndexedAccess가 꺼져 있어 타입이 non-null로 좁혀지므로 직접 명시한다.
  const step: GuideStep | undefined = steps[activeIndex]
  const isLastStep = steps.length > 0 && activeIndex === steps.length - 1

  const goPrevStep = () => {
    setActiveIndex((index) => Math.max(index - 1, 0))
  }

  const goNextStep = () => {
    setActiveIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  /** 마지막 단계에서만 노출. 도착 완료 화면(6-1)으로 넘어간다. */
  const completeArrival = () => {
    // TODO: 도착 완료 화면(6-1)이 붙으면 PlaceholderScreen을 교체한다.
    void navigate(ARRIVAL_PATH)
  }

  /**
   * 표지판을 다시 찍어 경로를 처음부터 다시 계산한다.
   *
   * 카메라 화면은 replace로 띄운다. push하면 촬영 후 replace로 돌아올 때
   * 히스토리에 /guide가 두 번 쌓여 뒤로가기가 같은 화면에 걸린다.
   */
  const rescanRoute = () => {
    showToast(t('routeGuide.rescanning'))
    void navigate('/scan', {
      state: { returnTo: ROUTE_GUIDE_PATH },
      replace: true,
    })
  }

  /**
   * 역 내 현재 위치 지도. 현재 위치는 보고 있는 단계의 표지판 위치와 같다 —
   * 위치의 근거가 GPS 가 아니라 "마지막으로 확인한 표지판"이기 때문이다.
   */
  const [isMapOpen, setIsMapOpen] = useState(false)

  const requestHelp = () => {
    void navigate('/help')
  }

  return (
    <MobileScreen
      header={
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t('routeGuide.back')}
              onClick={() => void navigate(-1)}
              className="text-ink -ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full"
            >
              <ChevronLeftIcon className="size-5" strokeWidth={2} />
            </button>

            <p className="text-brand-dark text-[14px] font-bold">
              {t('routeGuide.stepCount', {
                current: steps.length > 0 ? activeIndex + 1 : 0,
                total: steps.length,
              })}
            </p>

            <div className="ml-auto">
              <RescanButton onClick={rescanRoute} />
            </div>
          </div>

          <StepProgressBar
            current={steps.length > 0 ? activeIndex + 1 : 0}
            total={steps.length}
            label={t('routeGuide.progress', {
              current: steps.length > 0 ? activeIndex + 1 : 0,
              total: steps.length,
            })}
          />
        </div>
      }
    >
      {isPending ? (
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-3"
        >
          <span
            aria-hidden
            className="border-line border-t-brand size-9 animate-spin rounded-full border-4"
          />
          <p className="text-ink-muted text-[13px]">
            {t('routeGuide.loading')}
          </p>
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('routeGuide.failed')}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && !step ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('routeGuide.empty')}
          </p>
          <Button variant="secondary" onClick={rescanRoute}>
            {t('routeGuide.rescan')}
          </Button>
        </div>
      ) : null}

      {step ? (
        // 프로토타입 배치: 지시문 → 표지판 → 이전/다음 → 위치 보기 → (하단 여백) 도움 요청
        <div className="flex flex-1 flex-col gap-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <GuideInstructionCard instruction={step.instruction} />

          <section className="flex flex-col gap-2">
            <SectionLabel>{t('routeGuide.nextSign')}</SectionLabel>
            <SignBoardCard sign={step.sign} />
          </section>

          <StepNavigator
            activeIndex={activeIndex}
            count={steps.length}
            onPrev={goPrevStep}
            onNext={goNextStep}
          />

          <StationLocationButton onClick={() => setIsMapOpen(true)} />

          {isLastStep ? (
            <Button size="lg" fullWidth onClick={completeArrival}>
              {t('routeGuide.arrive')}
            </Button>
          ) : null}

          {/* 도움 요청은 남는 공간 아래쪽 끝, 엄지가 닿는 오른쪽에 띄운다. */}
          <div className="mt-auto flex justify-end pt-2">
            <HelpRequestButton onClick={requestHelp} />
          </div>
        </div>
      ) : null}

      {isMapOpen ? (
        <StationMapOverlay
          steps={steps}
          currentIndex={activeIndex}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}
    </MobileScreen>
  )
}
