import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'
import { useCurrentNodeStore } from '@/shared/lib/store/useCurrentNodeStore'
import { useElevatorFallbackStore } from '@/shared/lib/store/useElevatorFallbackStore'
import { useGuideStepStore } from '@/shared/lib/store/useGuideStepStore'
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
import { useStepSwipe } from '@/user/features/route-guide/useStepSwipe'

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
    "엘리베이터 없이 다시 찾기"를 누른 구간.

    저장된 답을 고치지 않고 이 구간에만 덮어쓴다. 사용자가 엘리베이터를
    원한다는 사실 자체는 바뀌지 않았고(이 역에 계단 없는 길이 없을 뿐),
    답을 덮어쓰면 다른 역에서 다시 안내할 때도 계단을 쓰게 된다.

    ⚠️ 지역 state 로 두면 안 된다. 도움 요청 → 화상 상담을 다녀오면 이 페이지가
       다시 마운트되면서 값이 false 로 돌아가, 이미 통과한 "엘리베이터 경로가
       없어요" 안내를 처음부터 다시 만난다. (요청 본문이 queryKey 라 성공했던
       응답의 캐시와도 어긋난다) 그래서 sessionStorage 스토어에 남긴다.
  */
  const elevatorFallbackPoint = useElevatorFallbackStore(
    (state) => state.finalPoint,
  )
  const setElevatorFallback = useElevatorFallbackStore(
    (state) => state.setElevatorFallback,
  )

  const request = useMemo<NavRouteRequest | null>(() => {
    if (!answers) return null

    const nodes = resolveStationNodes({ startPoint, finalPoint })

    // 그때 그 구간에서 고른 선택만 되살린다 — 다른 역·다른 여정에는 번지지 않는다.
    const ignoreElevator =
      elevatorFallbackPoint !== null &&
      elevatorFallbackPoint === nodes.finalPoint

    return buildNaviRequest({
      ...nodes,
      answers: ignoreElevator ? { ...answers, useElevator: false } : answers,
      langCode: toLangCode(language),
    })
  }, [answers, startPoint, finalPoint, elevatorFallbackPoint, language])

  const { data, isPending, isError, error, refetch } = useRouteGuide(request)

  const steps = useMemo(() => data?.steps ?? [], [data])
  const [activeIndex, setActiveIndex] = useState(0)

  // 재탐색으로 단계 수가 줄어들면 보고 있던 인덱스가 범위를 벗어나므로 되돌린다.
  // (매 refetch마다 0으로 리셋하면 안내 중 단계가 튄다)
  useEffect(() => {
    setActiveIndex((index) => (index < steps.length ? index : 0))
  }, [steps.length])

  /*
    화상 상담에 다녀온 뒤 보고 있던 단계로 되돌린다.

    도움 요청 → 화상 상담을 거쳐 오면 이 페이지가 다시 마운트되고 activeIndex 가
    0 으로 시작한다. 스토어에 남겨 둔 마지막 단계를 그때 되살린다.

    ⚠️ 목표는 **첫 렌더에 한 번만** 읽어야 한다. 아래 저장 이펙트가 마운트 직후
       0 번 단계로 스토어를 덮어쓰므로, 스토어를 구독해서 읽으면 복원 대상이
       이미 사라진 뒤다. useState 의 지연 초기화로 렌더 전에 붙잡아 둔다.
  */
  const [restoreTarget] = useState(() => {
    const { stepIndex, stepNodeId } = useGuideStepStore.getState()
    return { stepIndex, stepNodeId }
  })
  const hasRestoredRef = useRef(false)

  /*
    복원은 "마운트 시점"이 아니라 "단계가 도착한 시점"에 한다 — 상담이 길어지면
    React Query 캐시(gcTime 기본 5분)가 비워져 돌아왔을 때 steps 가 아직 없다.
    한 번 시도하면 다시 하지 않는다. 사용자가 복원된 뒤 [이전]으로 되돌아갔는데
    refetch 가 다시 앞으로 끌어당기면 안 되기 때문이다.
  */
  useEffect(() => {
    if (hasRestoredRef.current) return
    if (steps.length === 0) return

    hasRestoredRef.current = true

    const { stepIndex, stepNodeId } = restoreTarget
    if (stepIndex === null || stepIndex <= 0) return

    // 경로가 새로 계산돼 그 자리에 다른 지점이 있으면 복원하지 않는다.
    // noUncheckedIndexedAccess 가 꺼져 있어 타입이 non-null 로 좁혀지므로 직접 명시한다.
    const saved: GuideStep | undefined = steps[stepIndex]
    if (!saved || saved.from !== stepNodeId) return

    setActiveIndex(stepIndex)
  }, [steps, restoreTarget])

  // noUncheckedIndexedAccess가 꺼져 있어 타입이 non-null로 좁혀지므로 직접 명시한다.
  const step: GuideStep | undefined = steps[activeIndex]
  const isLastStep = steps.length > 0 && activeIndex === steps.length - 1

  /*
    보고 있는 단계의 from = 사용자의 현재 위치 노드. (8/5 명세 추가)

    [이전]·[다음] 으로 보는 이미지가 바뀌면 그 단계의 from 으로 갱신된다.
    (상담에 다녀와 단계가 복원되면 복원된 단계의 from 으로 다시 맞춰진다) 도움 요청 화면으로 넘어간 뒤 상담을 요청하면 이 값이
    `POST /consultations` 의 currentNodeId 로 실린다 — 역무원이 지도에서
    사용자 위치를 볼 때 쓴다(useConsultationRequest 참고).
  */
  const setCurrentNodeId = useCurrentNodeStore(
    (state) => state.setCurrentNodeId,
  )
  useEffect(() => {
    if (step?.from) setCurrentNodeId(step.from)
  }, [step?.from, setCurrentNodeId])

  /*
    보고 있는 단계를 스토어에 남긴다. 상담에 다녀온 뒤 위 복원 이펙트가 읽는다.
    인덱스와 함께 그 단계의 from 도 저장해 둔다 — 경로가 다시 계산됐을 때
    같은 번호가 다른 지점을 가리키는 것을 복원 직전에 걸러 내기 위해서다.
  */
  const setGuideStep = useGuideStepStore((state) => state.setGuideStep)
  useEffect(() => {
    if (step?.from) setGuideStep(activeIndex, step.from)
  }, [activeIndex, step?.from, setGuideStep])

  const goPrevStep = () => {
    setActiveIndex((index) => Math.max(index - 1, 0))
  }

  const goNextStep = () => {
    setActiveIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  /*
    표지판 카드를 좌우로 끌어도 단계가 넘어간다. 드래그 중에는 카드가
    손가락을 따라오고, 놓으면 트랙 transition 이 새 단계(또는 제자리)로
    미끄러뜨린다. 첫·마지막 단계 밖으로는 저항만 걸리고 넘어가지 않는다.
  */
  const swipe = useStepSwipe({
    onSwipeLeft: goNextStep,
    onSwipeRight: goPrevStep,
    canSwipeLeft: activeIndex < steps.length - 1,
    canSwipeRight: activeIndex > 0,
  })

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
  const clearGuideStep = useGuideStepStore((state) => state.clearGuideStep)

  const rescanRoute = () => {
    /*
      재탐색은 "지금 내가 어디인지 다시 잡는다"는 뜻이라, 보고 있던 단계를 버린다.
      새로 계산된 경로의 첫 단계가 곧 새 현재 위치다. (남겨 두면 대조에 걸려
      복원되지 않기는 하지만, 우연히 같은 노드가 같은 자리에 오면 엉뚱한
      단계로 튈 수 있다)
    */
    clearGuideStep()
    showToast(t('routeGuide.rescanning'))
    void navigate('/scan', {
      state: { returnTo: ROUTE_GUIDE_PATH },
      replace: true,
    })
  }

  /** 엘리베이터 조건을 빼고 다시 찾는다. request 가 바뀌어 자동으로 재조회된다. */
  const retryWithoutElevator = () => {
    setElevatorFallback(
      resolveStationNodes({ startPoint, finalPoint }).finalPoint,
    )
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
        // 배치: 지점(표지판·사진) → 지시문 → 이전/다음 → 위치 보기 → (여백) 도움 요청
        <div className="flex flex-1 flex-col gap-3.5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <section className="flex flex-col gap-2">
            <SectionLabel>
              {step.sign ? t('routeGuide.nextSign') : t('routeGuide.nextPoint')}
            </SectionLabel>

            {/*
              모든 단계의 카드를 가로 트랙으로 늘어놓고 보이는 창만 남긴다.
              트랙 너비는 컨테이너와 같으므로 translateX(-100%) = 카드 한 장이다.
              드래그 중에는 transition 을 꺼 손가락에 붙고, 놓으면 켜져 미끄러진다.
            */}
            <div
              {...swipe.handlers}
              className="touch-pan-y overflow-hidden select-none"
            >
              <div
                className={cn(
                  'flex',
                  !swipe.isDragging &&
                    'transition-transform duration-300 ease-out',
                )}
                style={{
                  transform: `translateX(calc(${-activeIndex * 100}% + ${swipe.dragX}px))`,
                }}
              >
                {steps.map((guideStep, index) => (
                  <div
                    key={`${index}-${guideStep.from}`}
                    aria-hidden={index !== activeIndex}
                    className="w-full shrink-0"
                  >
                    {/* 표지판이 있는 지점과 없는 지점(개찰구·편의점)은 카드가 다르다. */}
                    {guideStep.sign ? (
                      <SignBoardCard sign={guideStep.sign} />
                    ) : (
                      <ArrivalPointCard
                        arriveType={guideStep.arriveType}
                        arriveCategory={guideStep.arriveCategory}
                        arrivedFor={guideStep.arrivedFor}
                        imageUrl={guideStep.facilityImageUrl}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <GuideInstructionCard instruction={step.instruction} />

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
