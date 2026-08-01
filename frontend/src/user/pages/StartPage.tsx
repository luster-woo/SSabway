import { useState } from 'react'
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
      const coords = await requestLocation()

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

  /** 다시 선택하면 이전 좌표로 찾은 역 이름도 버린다. */
  const changeConsent = () => {
    resetConsent()
    clearStation()
  }

  const startGuide = () => {
    if (consent === null) {
      showToast(t('start.needConsentFirst'))
      return
    }
    // TODO: 표지판 촬영 화면(sign-capture) 연결
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
    // TODO: 로그인 화면 연결
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
            station={station}
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
