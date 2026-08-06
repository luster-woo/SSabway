import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useCurrentNodeStore } from '@/shared/lib/store/useCurrentNodeStore'
import { useRoutePreferenceStore } from '@/shared/lib/store/useRoutePreferenceStore'
import {
  resolveStationNodes,
  useStationNodeStore,
} from '@/shared/lib/store/useStationNodeStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import { StationMapOverlay } from '@/shared/station-map/StationMapOverlay'
import type { NavRouteRequest } from '@/shared/types/navigation'
import type { GuideStep } from '@/shared/types/routeGuide'
import { Button, MobileScreen, SectionLabel, useToast } from '@/shared/ui'
import { toLangCode } from '@/user/features/auth/lib/language'
import { ArrivalPointCard } from '@/user/features/route-guide/ArrivalPointCard'
import { GuideInstructionCard } from '@/user/features/route-guide/GuideInstructionCard'
import { HelpRequestButton } from '@/user/features/route-guide/HelpRequestButton'
import { RescanButton } from '@/user/features/route-guide/RescanButton'
import { SignBoardCard } from '@/user/features/route-guide/SignBoardCard'
import { StationLocationButton } from '@/user/features/route-guide/StationLocationButton'
import { StepNavigator } from '@/user/features/route-guide/StepNavigator'
import { StepProgressBar } from '@/user/features/route-guide/StepProgressBar'
import { ChevronLeftIcon } from '@/user/features/route-guide/icons'
import { buildNaviRequest } from '@/user/features/route-guide/lib/buildNaviRequest'
import {
  NAV_RECOVERY,
  toNavFailure,
} from '@/user/features/route-guide/lib/naviError'
import { useRouteGuide } from '@/user/features/route-guide/useRouteGuide'

/** 경로 재탐색을 마치고 돌아올 경로. SignCapturePage가 state로 받는다. */
const ROUTE_GUIDE_PATH = '/guide'

/** 마지막 단계에서 [다음]을 누르면 가는 곳 */
const ARRIVAL_PATH = '/arrival'

/** 질문에 답하는 화면. 답이 없으면 여기로 돌려보낸다. */
const USER_INFO_PATH = '/user-info'

/**
 * 6. 경로 상세 안내 — 역 내 지점을 하나씩 확인하며 이동하는 화면.
 *
 * 한 화면에 한 단계만 보여준다. [이전]·[다음]으로 단계를 넘기고,
 * 안내와 눈앞 상황이 어긋나면 '경로 재탐색'으로 표지판 촬영 화면(2)에 다시 다녀온다.
 *
 * 요청 본문은 세 곳에서 모인다.
 *   출발·도착 노드  useStationNodeStore (표지판 인식 결과. 없으면 파일럿 기본값)
 *   질문 답변       useRoutePreferenceStore (안내 정보 확인 화면에서 저장)
 *   언어            useLanguage
 * 하나라도 없으면 요청을 보내지 않는다 — 빈 본문은 400 이고, 화면에는
 * "경로 없음"으로 보여 사용자가 원인을 오해한다.
 */
export default function RouteGuidePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { language } = useLanguage()

  const answers = useRoutePreferenceStore((state) => state.answers)
  const startPoint = useStationNodeStore((state) => state.startPoint)
  const finalPoint = useStationNodeStore((state) => state.finalPoint)

  /*
    "엘리베이터 없이 다시 찾기"를 누르면 켜진다.

    저장된 답을 고치지 않고 이 화면에서만 덮어쓴다. 사용자가 엘리베이터를
    원한다는 사실 자체는 바뀌지 않았고(이 역에 계단 없는 길이 없을 뿐),
    답을 덮어쓰면 다른 역에서 다시 안내할 때도 계단을 쓰게 된다.
  */
  const [ignoreElevator, setIgnoreElevator] = useState(false)

  const request = useMemo<NavRouteRequest | null>(() => {
    if (!answers) return null

    const nodes = resolveStationNodes({ startPoint, finalPoint })

    return buildNaviRequest({
      ...nodes,
      answers: ignoreElevator ? { ...answers, useElevator: false } : answers,
      langCode: toLangCode(language),
    })
  }, [answers, startPoint, finalPoint, ignoreElevator, language])

  const { data, isPending, isError, error, refetch } = useRouteGuide(request)

  const steps = useMemo(() => data?.steps ?? [], [data])
  const [activeIndex, setActiveIndex] = useState(0)

  // 재탐색으로 단계 수가 줄어들면 보고 있던 인덱스가 범위를 벗어나므로 되돌린다.
  // (매 refetch마다 0으로 리셋하면 안내 중 단계가 튄다)
  useEffect(() => {
    setActiveIndex((index) => (index < steps.length ? index : 0))
  }, [steps.length])

  // noUncheckedIndexedAccess가 꺼져 있어 타입이 non-null로 좁혀지므로 직접 명시한다.
  const step: GuideStep | undefined = steps[activeIndex]
  const isLastStep = steps.length > 0 && activeIndex === steps.length - 1

  /*
    보고 있는 단계의 from = 사용자의 현재 위치 노드. (8/5 명세 추가)

    이 화면은 들어오면 무조건 첫 번째 단계를 띄우므로 처음에는 첫 단계의
    from 이 담기고, [이전]·[다음] 으로 보는 이미지가 바뀌면 그 단계의 from 으로
    갱신된다. 도움 요청 화면으로 넘어간 뒤 상담을 요청하면 이 값이
    `POST /consultations` 의 currentNodeId 로 실린다 — 역무원이 지도에서
    사용자 위치를 볼 때 쓴다(useConsultationRequest 참고).
  */
  const setCurrentNodeId = useCurrentNodeStore(
    (state) => state.setCurrentNodeId,
  )
  useEffect(() => {
    if (step?.from) setCurrentNodeId(step.from)
  }, [step?.from, setCurrentNodeId])

  const goPrevStep = () => {
    setActiveIndex((index) => Math.max(index - 1, 0))
  }

  const goNextStep = () => {
    setActiveIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  /** 마지막 단계에서만 노출. 도착 완료 화면(6-1)으로 넘어간다. */
  const completeArrival = () => {
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

  /** 엘리베이터 조건을 빼고 다시 찾는다. request 가 바뀌어 자동으로 재조회된다. */
  const retryWithoutElevator = () => {
    setIgnoreElevator(true)
    showToast(t('routeGuide.retryingWithStairs'))
  }

  /**
   * 역 내 현재 위치 지도. 현재 위치는 보고 있는 단계의 지점과 같다 —
   * 위치의 근거가 GPS 가 아니라 "마지막으로 확인한 지점"이기 때문이다.
   */
  const [isMapOpen, setIsMapOpen] = useState(false)

  const requestHelp = () => {
    void navigate('/help')
  }

  /* 실패 원인별 문구와, 사용자가 할 수 있는 행동. */
  const failure = isError ? toNavFailure(error, request) : null

  const recoveryAction = {
    [NAV_RECOVERY.RESCAN]: { labelKey: 'routeGuide.rescan', run: rescanRoute },
    [NAV_RECOVERY.WITHOUT_ELEVATOR]: {
      labelKey: 'routeGuide.withoutElevator',
      run: retryWithoutElevator,
    },
    [NAV_RECOVERY.RETRY]: {
      labelKey: 'common.retry',
      run: () => void refetch(),
    },
    [NAV_RECOVERY.CHANGE_ANSWERS]: {
      labelKey: 'routeGuide.changeAnswers',
      run: () => void navigate(USER_INFO_PATH),
    },
  }

  // 답이 없으면 조회 자체를 하지 않으므로 로딩·에러가 아니라 이 안내가 뜬다.
  const needsAnswers = request === null

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

            {/*
              mr-12 는 사용법 안내 위젯(TutorialFab) 자리다. 그 위젯이 우측 상단에
              고정으로 뜨는데, 재탐색이 오른쪽 끝에 붙어 있으면 겹친다.
            */}
            <div className="mr-12 ml-auto">
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
      {needsAnswers ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('routeGuide.needAnswers')}
          </p>
          <Button
            variant="secondary"
            onClick={() => void navigate(USER_INFO_PATH)}
          >
            {t('routeGuide.goAnswer')}
          </Button>
        </div>
      ) : null}

      {!needsAnswers && isPending ? (
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

      {failure ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t(failure.messageKey, failure.params)}
          </p>
          <Button
            variant="secondary"
            onClick={recoveryAction[failure.recovery].run}
          >
            {t(recoveryAction[failure.recovery].labelKey)}
          </Button>
        </div>
      ) : null}

      {!needsAnswers && !isPending && !isError && !step ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('routeGuide.empty')}
          </p>
          <Button variant="secondary" onClick={rescanRoute}>
            {t('routeGuide.rescan')}
          </Button>
        </div>
      ) : null}

      {step && data ? (
        // 배치: 지시문 → 지점 → 이전/다음 → 위치 보기 → (여백) 도움 요청
        <div className="flex flex-1 flex-col gap-3.5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <GuideInstructionCard instruction={step.instruction} />

          <section className="flex flex-col gap-2">
            <SectionLabel>
              {step.sign ? t('routeGuide.nextSign') : t('routeGuide.nextPoint')}
            </SectionLabel>

            {/* 표지판이 있는 지점과 없는 지점(개찰구·편의점)은 카드가 다르다. */}
            {step.sign ? (
              <SignBoardCard sign={step.sign} />
            ) : (
              <ArrivalPointCard
                arriveType={step.arriveType}
                arriveCategory={step.arriveCategory}
                arrivedFor={step.arrivedFor}
              />
            )}
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
          <div className="mt-auto flex justify-end pt-1">
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
