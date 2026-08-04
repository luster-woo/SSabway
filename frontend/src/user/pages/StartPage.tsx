import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { requestLogout } from '@/shared/api/client'
import { disableGoogleAutoSelect } from '@/shared/lib/googleIdentity'
import { useLanguage } from '@/shared/lib/useLanguage'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import {
  LOCATION_CONSENT,
  useLocationConsentStore,
} from '@/shared/lib/store/useLocationConsentStore'
import { useOriginStationStore } from '@/shared/lib/store/useOriginStationStore'
import type { Language } from '@/shared/types/user'
import {
  AppLogo,
  Button,
  MobileScreen,
  SectionLabel,
  useToast,
} from '@/shared/ui'
import { AccountMenu } from '@/user/features/auth/AccountMenu'
import { WithdrawDialog } from '@/user/features/auth/WithdrawDialog'
import { LanguageSelector } from '@/user/features/start/LanguageSelector'
import { LocationConsentCard } from '@/user/features/start/LocationConsentCard'
import { LocationConsentStatus } from '@/user/features/start/LocationConsentStatus'
import { useNearbyStation } from '@/user/features/start/useNearbyStation'
import { useSyncLanguageOnLeave } from '@/user/features/start/useSyncLanguageOnLeave'
import { requestLocation } from '@/user/features/start/lib/requestLocation'

const LANGUAGE_LABEL_ID = 'start-language-label'

/** 1. 시작 페이지 — user 앱의 진입점 */
export default function StartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { language, changeLanguage } = useLanguage()

  // 페이지를 벗어날 때, 로그인 상태에서 언어가 바뀌었다면 서버에 저장한다.
  useSyncLanguageOnLeave()

  /*
    'idle' 은 비로그인이 아니라 "아직 모름" 이다. (UserApp 의 useRestoreSession)
    비로그인으로 취급하면 새로고침 직후 로그인 버튼이 보였다가 아바타로 바뀐다.
  */
  const authStatus = useAuthStore((s) => s.status.user)
  const isLoggedIn = authStatus === 'authenticated'
  const isAuthPending = authStatus === 'idle'

  /** 회원 탈퇴 다이얼로그. 비밀번호 확인이 필요해 토스트가 아니라 모달로 처리한다. */
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

  const consent = useLocationConsentStore((s) => s.consent)
  const setConsent = useLocationConsentStore((s) => s.setConsent)
  const resetConsent = useLocationConsentStore((s) => s.resetConsent)

  const setOriginStation = useOriginStationStore((s) => s.setOriginStation)
  const clearOriginStation = useOriginStationStore((s) => s.clearOriginStation)

  const selectLanguage = (next: Language) => {
    changeLanguage(next)
    showToast(t('language.changed', { lng: next }))
  }

  /**
   * 위치를 잡는 동안 버튼을 잠근다.
   *
   * 지하에서는 타임아웃(10초)까지 걸릴 수 있어 그동안 반응이 없으면
   * 사용자가 버튼을 연타한다. 다른 화면이 알 필요는 없어 로컬 상태로 둔다.
   */
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)

  const { station, findStation, clear: clearStation } = useNearbyStation()

  /*
    GPS로 잡은 역을 스토어에 반영한다. 목적지 설정 화면의 "내 위치" 마커 라벨과
    상담 요청의 출발지(departure)가 이 값을 쓴다.

    ⚠️ null 은 덮어쓰지 않는다.

    station 은 useNearbyStation 의 로컬 state 라 이 화면에 다시 들어올 때마다
    null 로 시작한다. 그때 스토어까지 비우면 이미 잡아 둔 출발역이 사라지는데,
    consent 는 스토어에 남아 있어 사용자가 「동의」를 다시 누르지 않으므로
    GPS 재조회도 일어나지 않는다 → 출발역이 영구히 빈 상태가 된다.
    (안내를 한 바퀴 돌고 「처음으로」 로 돌아오면 바로 이 상황이었다.
     그 뒤 도움 요청 화면이 "출발지와 목적지를 알아야 연결할 수 있어요" 로
     막혀 화상 상담을 시작할 수 없었다.)

    명시적으로 버리는 지점은 아래 changeConsent(「다시 선택」) 하나다.
  */
  useEffect(() => {
    if (station !== null) setOriginStation(station)
  }, [station, setOriginStation])

  /**
   * 실제 브라우저 권한을 요청하고, 좌표를 받으면 가까운 역까지 조회한다.
   *
   * 좌표를 못 받아도 consent 는 DENIED 로 확정한다. null(선택 전)로 두면
   * startGuide 의 가드에 걸려 「안내 시작」 을 누를 수 없는데, 지하철역은
   * GPS 가 안 잡히는 게 정상인 곳이라 그대로 두면 진행이 막힌다.
   * DENIED 는 "표지판 촬영으로 간다" 는 뜻이고 그게 이때 맞는 경로다.
   * 다시 시도하고 싶으면 「다시 선택」 → 「동의」 로 돌아올 수 있다.
   */
  const allowLocation = async () => {
    setIsRequestingLocation(true)

    try {
      // 최근접 역을 정확히 고르려면 고정밀 + 새 좌표가 필요하다.
      // (지도 "내 위치" 마커는 대략 위치면 되므로 기본 저정밀을 그대로 쓴다.)
      const coords = await requestLocation({ highAccuracy: true, maxAgeMs: 0 })

      if (coords === null) {
        setConsent(LOCATION_CONSENT.DENIED)
        showToast(t('start.consent.unavailable'))
        return
      }

      setConsent(LOCATION_CONSENT.GRANTED)
      showToast(t('start.consent.allowed'))

      // 역 조회는 부가 정보라 실패해도 동의 상태를 되돌리지 않는다.
      await findStation(coords)
    } finally {
      setIsRequestingLocation(false)
    }
  }

  const denyLocation = () => {
    setConsent(LOCATION_CONSENT.DENIED)
    showToast(t('start.consent.denied'))
  }

  /** 다시 선택하면 이전 좌표로 찾은 역 이름도 버린다. (스토어까지 함께) */
  const changeConsent = () => {
    resetConsent()
    clearStation()
    clearOriginStation()
  }

  const startGuide = () => {
    if (consent === null) {
      showToast(t('start.needConsentFirst'))
      return
    }
    void navigate('/scan')
  }

  /**
   * 서버에서 리프레시 토큰을 무효화한 뒤 안내한다.
   * requestLogout 은 요청이 실패해도 로컬 토큰을 지우므로 성공 여부를 따지지 않는다.
   *
   * 구글 자동 선택도 함께 해제한다. 우리 쪽 토큰만 지우면 다음 로그인에서
   * 계정 선택 없이 같은 계정으로 다시 들어간다.
   */
  const signOut = async () => {
    await requestLogout('user')
    disableGoogleAutoSelect()
    showToast(t('auth.signedOut'))
  }

  const moveToLogin = () => {
    void navigate('/login')
  }

  return (
    <MobileScreen
      header={
        <div className="flex justify-end">
          {isAuthPending ? (
            // 아바타와 같은 크기의 빈 자리. 판정이 끝날 때 헤더가 흔들리지 않는다.
            <div aria-hidden className="size-[34px]" />
          ) : (
            <AccountMenu
              isLoggedIn={isLoggedIn}
              onSignIn={moveToLogin}
              onSignOut={() => void signOut()}
              onDeleteAccount={() => setIsWithdrawOpen(true)}
            />
          )}
        </div>
      }
      footer={
        <Button size="lg" fullWidth onClick={startGuide}>
          {t('start.startGuide')}
        </Button>
      }
    >
      <section className="flex flex-col items-center pt-[clamp(12px,3vh,28px)] text-center">
        <AppLogo />
        <h1 className="text-ink mt-[clamp(16px,3vh,26px)] text-[clamp(24px,7.5vw,30px)] leading-none font-bold">
          {t('app.name')}
        </h1>
        <p className="text-ink-muted mt-3 text-[clamp(12px,3.6vw,13px)] leading-5">
          {t('app.tagline')}
        </p>
      </section>

      <section className="mt-[clamp(20px,4.5vh,38px)]">
        <SectionLabel id={LANGUAGE_LABEL_ID}>
          {t('language.select')}
        </SectionLabel>
        <div className="mt-3">
          <LanguageSelector
            value={language}
            onChange={selectLanguage}
            labelledBy={LANGUAGE_LABEL_ID}
          />
        </div>
      </section>

      <section className="mt-[clamp(16px,3vh,26px)] pb-4">
        {consent === null ? (
          <LocationConsentCard
            onAllow={() => void allowLocation()}
            onDeny={denyLocation}
            isRequesting={isRequestingLocation}
          />
        ) : (
          <LocationConsentStatus
            granted={consent === LOCATION_CONSENT.GRANTED}
            station={station?.name ?? null}
            onChange={changeConsent}
          />
        )}
      </section>

      {isWithdrawOpen ? (
        <WithdrawDialog onClose={() => setIsWithdrawOpen(false)} />
      ) : null}
    </MobileScreen>
  )
}
