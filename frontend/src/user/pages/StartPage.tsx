import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { requestLogout } from '@/shared/api/client'
import { disableGoogleAutoSelect } from '@/shared/lib/googleIdentity'
import { useLanguage } from '@/shared/lib/useLanguage'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { Language } from '@/shared/types/user'
import {
  AppLogo,
  Button,
  MobileScreen,
  SectionLabel,
  useToast,
} from '@/shared/ui'
import { AccountMenu } from '@/user/features/auth/AccountMenu'
import type { LoginFromState } from '@/user/features/auth/loginFrom'
import { WithdrawDialog } from '@/user/features/auth/WithdrawDialog'
import { InstallPromptSheet } from '@/user/features/install/InstallPromptSheet'
import { useInstallPrompt } from '@/user/features/install/useInstallPrompt'
import { LandingSplash } from '@/user/features/start/LandingSplash'
import { LanguageSelector } from '@/user/features/start/LanguageSelector'
import { TutorialGuideBanner } from '@/user/features/start/TutorialGuideBanner'
import { TutorialModal } from '@/user/features/tutorial/TutorialModal'
import { useLandingSplash } from '@/user/features/start/useLandingSplash'
import { useSyncLanguageOnLeave } from '@/user/features/start/useSyncLanguageOnLeave'

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
    서비스 첫 접속에서만 랜딩(스플래시)을 덮는다.
    이 화면을 가리는 동안에도 아래 화면은 정상적으로 마운트돼 세션 복구가
    랜딩 뒤에서 그대로 준비된다.
  */
  const landingPhase = useLandingSplash()

  /*
    앱 설치 유도 바텀시트. 랜딩이 완전히 걷힌 뒤에 올라온다.
    (표시 주기·조건은 useInstallPrompt 주석 참고 — 접속마다 1회)
  */
  const installPrompt = useInstallPrompt(landingPhase === 'hidden')

  /*
    'idle' 은 비로그인이 아니라 "아직 모름" 이다. (UserApp 의 useRestoreSession)
    비로그인으로 취급하면 새로고침 직후 로그인 버튼이 보였다가 아바타로 바뀐다.
  */
  const authStatus = useAuthStore((s) => s.status.user)
  const isLoggedIn = authStatus === 'authenticated'
  const isAuthPending = authStatus === 'idle'

  /** 회원 탈퇴 다이얼로그. 비밀번호 확인이 필요해 토스트가 아니라 모달로 처리한다. */
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

  /**
   * 사용법 안내 모달. 열 때마다 새로 마운트해 1페이지부터 보게 한다.
   * (GIF 도 그때 처음 내려온다 — 안 여는 사용자는 받지 않는다)
   */
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  const selectLanguage = (next: Language) => {
    changeLanguage(next)
    showToast(t('language.changed', { lng: next }))
  }

  /**
   * 안내 시작 — 표지판 촬영 화면으로 간다.
   * 출발지는 촬영한 표지판의 역(stationName)이 정한다(SignCapturePage).
   */
  const startGuide = () => {
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

  /**
   * 로그인 화면으로. 성공하면 이 화면으로 돌아와야 하므로 `from` 을 넘긴다.
   * (히스토리로 되돌리면 안 되는 이유는 features/auth/loginFrom 주석 참고)
   */
  const moveToLogin = () => {
    void navigate('/login', { state: { from: '/' } satisfies LoginFromState })
  }

  /**
   * 설치 버튼. 브라우저 다이얼로그의 결과만 안내하고, 사용자가 그 다이얼로그에서
   * 직접 취소한 경우(dismissed)와 iOS 안내를 닫은 경우는 조용히 넘긴다 —
   * 이미 무슨 일이 있었는지 아는 사용자에게 토스트는 잔소리다.
   */
  const acceptInstall = async () => {
    const outcome = await installPrompt.accept()

    if (outcome === 'accepted') showToast(t('install.installed'))
    else if (outcome === 'unavailable') showToast(t('install.unavailable'))
  }

  return (
    <>
      {landingPhase === 'hidden' ? null : (
        <LandingSplash leaving={landingPhase === 'leaving'} />
      )}

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

        {/*
          사용법 안내 — 언어 선택 바로 아래에 붙인다.

          위치 권한 카드가 사라지면서(GPS 제거) 이 아래가 통째로 비었다. 남는
          공간 가운데(`my-auto`)에 띄우면 기기 높이에 따라 배너가 허공에 떠
          보이고 언어 선택과의 관계도 흐려진다. 언어를 고른 직후 시선이 그대로
          내려오는 자리에 두고, 남는 높이는 아래(「안내 시작」 위)에 모은다.
        */}
        <section className="mt-[clamp(16px,3vh,26px)]">
          <TutorialGuideBanner onOpen={() => setIsTutorialOpen(true)} />
        </section>

        {isWithdrawOpen ? (
          <WithdrawDialog onClose={() => setIsWithdrawOpen(false)} />
        ) : null}
      </MobileScreen>

      {isTutorialOpen ? (
        <TutorialModal onClose={() => setIsTutorialOpen(false)} />
      ) : null}

      {installPrompt.phase === 'hidden' ? null : (
        <InstallPromptSheet
          variant={installPrompt.variant}
          leaving={installPrompt.phase === 'leaving'}
          onAccept={() => void acceptInstall()}
          onDismiss={installPrompt.dismiss}
        />
      )}
    </>
  )
}
