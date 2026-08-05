import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { AppLogo, MobileViewport } from '@/shared/ui'

export interface LandingSplashProps {
  /** 페이드아웃 중인지. 이때는 탭이 아래 화면으로 통과한다. */
  leaving?: boolean
}

/** 사라질 때의 곡선·길이. useLandingSplash 의 FADE_MS 와 맞춘다. */
const LEAVE = 'duration-[560ms] ease-[cubic-bezier(0.4,0,0.2,1)]'

/**
 * 랜딩(스플래시) 화면 — 서비스 첫 접속에서 2초간 덮는다.
 *
 * 모션은 두 단계다.
 *   등장: 로고 → 이름 → 부제가 120ms 간격으로 떠오르며 나타난다.
 *         (index.css 의 animate-landing-mark / animate-landing-rise)
 *   퇴장: 화면 전체가 페이드아웃하는 동안 내용이 살짝 확대돼, 시작 페이지로
 *         빨려 들어가는 느낌을 준다. 딱 끊기지 않게 감속 곡선을 쓴다.
 * 두 단계 모두 motion-reduce 에서는 꺼진다(전정기관 민감 사용자 대응).
 *
 * 문구는 **영어로 고정**한다. 사용자가 아직 언어를 고르기 전 화면이고
 * 기본 언어가 영어(DEFAULT_LANGUAGE)이므로, 저장된 선택이 있든 없든 랜딩은
 * 영어로 통일한다. i18n 키(app.name·app.tagline)를 lng 지정으로 재사용해
 * 문구가 시작 페이지와 한 곳에서 관리되게 했다.
 *
 * MobileViewport 를 fixed 로 감싸 폰 규격(430px 컬럼)을 유지한다.
 * 데스크톱에서 창 전체가 파랗게 덮이지 않고 시작 페이지와 같은 틀에 뜬다.
 */
export function LandingSplash({ leaving = false }: LandingSplashProps) {
  const { t } = useTranslation(undefined, { lng: 'en' })

  return (
    <div
      // 랜딩은 바로 뒤의 시작 페이지와 내용이 겹치므로 보조기기에는 감춘다.
      aria-hidden
      className={cn(
        'fixed inset-0 z-50 transition-opacity motion-reduce:transition-none',
        LEAVE,
        leaving && 'pointer-events-none opacity-0',
      )}
    >
      <MobileViewport className="bg-landing">
        {/*
          로고 묶음을 화면 중앙보다 살짝 위에 둔다. (시안의 무게중심)
          pb 로 밀어 올려야 주소창 높이가 변해도 비율이 유지된다.
        */}
        <div
          className={cn(
            'min-h-viewport flex flex-col items-center justify-center pb-[12%]',
            'transition-transform motion-reduce:transition-none',
            LEAVE,
            leaving && 'scale-[1.04]',
          )}
        >
          <AppLogo
            variant="inverse"
            size="clamp(84px,24vw,108px)"
            className="animate-landing-mark motion-reduce:animate-none"
          />
          <p className="animate-landing-rise mt-[clamp(14px,3.5vh,22px)] text-[clamp(28px,9vw,40px)] leading-none font-bold text-white [animation-delay:120ms] motion-reduce:animate-none">
            {t('app.name')}
          </p>
          <p className="animate-landing-rise mt-3 px-8 text-center text-[clamp(12px,3.6vw,15px)] leading-5 text-white/85 [animation-delay:240ms] motion-reduce:animate-none">
            {t('app.tagline')}
          </p>
        </div>
      </MobileViewport>
    </div>
  )
}
