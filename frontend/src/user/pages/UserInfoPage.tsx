import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useRoutePreferenceStore } from '@/shared/lib/store/useRoutePreferenceStore'
import { useStationNodeStore } from '@/shared/lib/store/useStationNodeStore'
import { StationMapOverlay } from '@/shared/station-map/StationMapOverlay'
import { DAEGU_NODES } from '@/shared/station-map/daeguNavigation'
import type { RouteStepRef } from '@/shared/station-map/routePath'
import { Button, MobileScreen, SectionLabel, useToast } from '@/shared/ui'
import { GuideEndpointCard } from '@/user/features/user-info/GuideEndpointCard'
import { RoutePreferenceCard } from '@/user/features/user-info/RoutePreferenceCard'
import { ChevronLeftIcon } from '@/user/features/user-info/icons'
import { useGuideInfo } from '@/user/features/user-info/useGuideInfo'
import { useRoutePreference } from '@/user/features/user-info/useRoutePreference'

/** 표지판 촬영을 마치고 돌아올 경로. SignCapturePage가 state로 받는다. */
const USER_INFO_PATH = '/user-info'

/** 표시할 출발·도착이 없을 때 돌려보낼 곳. */
const ROUTE_PATH = '/route'

/**
 * 5. 안내 정보 확인 — 출발지·도착지와 이용 수단을 확정하는 화면.
 *
 * 출발지 '변경'을 누르면 표지판 촬영 화면으로 갔다가 인식이 끝나면 다시 이 화면으로
 * 돌아온다. 출발역·도착역 자체는 앞 화면(경로 선택)에서 고른 경로가 정한다
 * (`useSelectedRouteStore`).
 */
export default function UserInfoPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { info, isRouteMissing } = useGuideInfo()
  const preference = useRoutePreference()
  const setPreference = useRoutePreferenceStore((state) => state.setPreference)

  /** 표지판을 다시 찍어 출발지를 바꾼다. 인식이 끝나면 이 화면으로 돌아온다. */
  const changeOrigin = () => {
    void navigate('/scan', { state: { returnTo: USER_INFO_PATH } })
  }

  /*
    출발 아이콘을 누르면 역 내 위치 지도를 띄운다.

    위치의 근거는 표지판 촬영이 준 노드(startPoint)다. 관리자의 [사용자 위치
    보기]와 같은 방식으로, 노드 하나를 from === to 인 단계로 감싸 공용
    오버레이에 넘기면 경로선 없이 내 위치 점만 그려진다 (UserLocationModal 참고).

    노드가 없거나(지도에서 직접 고른 출발지 등) 도면 그래프에 없으면 아이콘을
    버튼으로 만들지 않는다 — 눌리는데 보여줄 것이 없는 쪽이 더 나쁘다.
  */
  const startPoint = useStationNodeStore((state) => state.startPoint)
  const originNodeId = startPoint && DAEGU_NODES[startPoint] ? startPoint : null
  const [isOriginMapOpen, setIsOriginMapOpen] = useState(false)
  const originLocationSteps = useMemo<RouteStepRef[]>(
    () =>
      originNodeId
        ? [{ edgeId: '', from: originNodeId, to: originNodeId }]
        : [],
    [originNodeId],
  )

  /** 목적지 설정(지도) 화면으로 보내 도착지를 다시 고른다. */
  const changeDestination = () => {
    void navigate('/destination')
  }

  const startGuide = () => {
    if (!preference.plan) {
      showToast(t('userInfo.needAnswers'))
      return
    }
    /*
      답을 스토어에 넘긴다. 경로 상세 안내 화면이 이 값으로 요청 본문을 만든다
      (buildNaviRequest). 두 화면이 형제라 props 로는 넘길 수 없다.
    */
    setPreference(preference.answers, preference.plan)
    showToast(t('userInfo.started'))
    void navigate('/guide')
  }

  return (
    <MobileScreen
      header={
        /*
          제목 글자는 그리지 않는다 — 아래 카드가 이미 "어디서 어디로"를 말해
          주어 같은 말을 반복했다. 다만 자리를 통째로 없애면 뒤로가기 버튼에
          카드가 바짝 붙어 답답해서, **제목이 차지하던 높이의 절반만** 비워 둔다.
            21px = 버튼과의 기존 간격 4px + 제목 높이(34px)의 절반 17px

          h1 자체는 sr-only 로 남긴다. 화면에서 지우자고 문서 구조까지 없애면
          스크린리더에 이 화면의 이름이 사라진다. (sr-only 는 absolute 라
          레이아웃에는 영향을 주지 않아 위 계산에도 끼지 않는다)
        */
        <div className="flex flex-col items-start pb-[21px]">
          <button
            type="button"
            aria-label={t('userInfo.back')}
            onClick={() => void navigate(-1)}
            className="text-ink -ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <ChevronLeftIcon className="size-5" strokeWidth={2} />
          </button>

          <h1 className="sr-only">{t('userInfo.title')}</h1>
        </div>
      }
      footer={
        <Button
          size="lg"
          fullWidth
          disabled={isRouteMissing || !preference.plan}
          onClick={startGuide}
        >
          {t('userInfo.start')}
        </Button>
      }
    >
      {/*
        경로 선택을 거치지 않으면 보여줄 출발·도착이 없다(URL 직접 진입,
        세션 만료로 스토어가 빈 경우). 로딩·에러 상태는 없다 — 서버 조회가
        아니라 스토어 파생이라 실패할 구간이 없다.
      */}
      {isRouteMissing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('userInfo.needRoute')}
          </p>
          <Button variant="secondary" onClick={() => void navigate(ROUTE_PATH)}>
            {t('userInfo.pickRoute')}
          </Button>
        </div>
      ) : null}

      {info ? (
        <div className="flex flex-col gap-5 pt-4 pb-2">
          <GuideEndpointCard
            info={info}
            onChangeOrigin={changeOrigin}
            onChangeDestination={changeDestination}
            onShowOriginLocation={
              originNodeId ? () => setIsOriginMapOpen(true) : undefined
            }
          />

          <section className="flex flex-col gap-2">
            <SectionLabel>{t('userInfo.preference.label')}</SectionLabel>
            <RoutePreferenceCard
              node={preference.node}
              activeIndex={preference.activeIndex}
              stepCount={preference.stepCount}
              canGoBack={preference.canGoBack}
              recalledAnswers={preference.recalledAnswers}
              onSelect={preference.select}
              onBack={preference.goBack}
              onReset={preference.reset}
            />
          </section>
        </div>
      ) : null}

      {isOriginMapOpen && originNodeId ? (
        <StationMapOverlay
          steps={originLocationSteps}
          currentIndex={0}
          /*
            보여줄 것이 위치 점 하나뿐이라 색 범례를 없애고, 대신 지도 안에서
            점 옆에 '현재 위치' 글자를 붙인다 — 화면 아래를 보지 않아도 읽힌다.
          */
          legend="none"
          showMyLocationLabel
          onClose={() => setIsOriginMapOpen(false)}
        />
      ) : null}
    </MobileScreen>
  )
}
