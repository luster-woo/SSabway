import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useRoutePreferenceStore } from '@/shared/lib/store/useRoutePreferenceStore'
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
        // 뒤로가기는 한 줄 위에 두고, 제목은 그 아래 왼쪽 끝에 맞춘다.
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            aria-label={t('userInfo.back')}
            onClick={() => void navigate(-1)}
            className="text-ink -ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <ChevronLeftIcon className="size-5" strokeWidth={2} />
          </button>

          <h1 className="text-ink text-[clamp(23px,6.6vw,27px)] leading-tight font-extrabold">
            {t('userInfo.title')}
          </h1>
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
    </MobileScreen>
  )
}
