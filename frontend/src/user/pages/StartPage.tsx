import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

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

  const isLoggedIn = useAuthStore((s) => s.status.user === 'authenticated')
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken)

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

  const signOut = () => {
    clearAccessToken('user')
    showToast(t('auth.signedOut'))
  }

  const deleteAccount = () => {
    // TODO: API 연동 시 탈퇴 확인 모달 + 요청 처리
    clearAccessToken('user')
    showToast(t('auth.accountDeleted'))
  }

  const moveToLogin = () => {
    // TODO: 로그인 화면 연결
    void navigate('/login')
  }

  return (
    <MobileScreen
      header={
        <div className="flex justify-end">
          <AccountMenu
            isLoggedIn={isLoggedIn}
            onSignIn={moveToLogin}
            onSignOut={signOut}
            onDeleteAccount={deleteAccount}
          />
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
    </MobileScreen>
  )
}
