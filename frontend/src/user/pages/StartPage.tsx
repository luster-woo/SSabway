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

const LANGUAGE_LABEL_ID = 'start-language-label'

/** 1. 시작 페이지 — user 앱의 진입점 */
export default function StartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { language, changeLanguage } = useLanguage()

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

  const allowLocation = () => {
    setConsent(LOCATION_CONSENT.GRANTED)
    showToast(t('start.consent.allowed'))
  }

  const denyLocation = () => {
    setConsent(LOCATION_CONSENT.DENIED)
    showToast(t('start.consent.denied'))
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
          <LocationConsentCard onAllow={allowLocation} onDeny={denyLocation} />
        ) : (
          <LocationConsentStatus
            granted={consent === LOCATION_CONSENT.GRANTED}
            onChange={resetConsent}
          />
        )}
      </section>

      {isWithdrawOpen ? (
        <WithdrawDialog onClose={() => setIsWithdrawOpen(false)} />
      ) : null}
    </MobileScreen>
  )
}
