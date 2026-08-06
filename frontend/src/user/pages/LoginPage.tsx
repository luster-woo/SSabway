import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { AppLogo, Button, MobileScreen, useToast } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { GoogleLoginButton } from '@/user/features/auth/GoogleLoginButton'
import { readLoginFrom } from '@/user/features/auth/loginFrom'
import { useGoogleLogin } from '@/user/features/auth/useGoogleLogin'
import { useUserLogin } from '@/user/features/auth/useUserLogin'

/** 뒤로가기 화살표 */
function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/**
 * 7-1. 로그인 — /login
 *
 * 로그인에 성공하거나 뒤로가기를 누르면 진입한 화면으로 되돌아간다.
 *
 * 돌아갈 곳은 히스토리가 아니라 라우터 state 의 `from` 이다. 이유는
 * `@/user/features/auth/loginFrom` 주석 참고 — 히스토리에 /login 이 연속으로
 * 쌓이는 경로가 있어서 `navigate(-1)` 은 제자리에 머무를 수 있다.
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  /** 로그인 성공·뒤로가기의 공통 목적지. 보낸 쪽이 state 로 알려준다. */
  const from = readLoginFrom(location.state)
  const goBack = () => void navigate(from, { replace: true })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isPending, errorKey } = useUserLogin()
  const {
    login: loginWithGoogle,
    isPending: isGooglePending,
    errorKey: googleErrorKey,
  } = useGoogleLogin()

  const isSubmittable = email.trim() !== '' && password !== '' && !isPending

  /**
   * 로그인 성공 후 처리. 일반·구글 로그인이 같다.
   *
   * replace 로 이동해 /login 을 히스토리에서 지운다. push 로 두면 로그인한
   * 사용자가 뒤로가기로 로그인 화면에 다시 들어온다.
   */
  const finishLogin = () => {
    showToast(t('auth.login.success'))
    void navigate(from, { replace: true })
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmittable) return

    const isLoggedIn = await login({ email: email.trim(), password })
    if (!isLoggedIn) return

    finishLogin()
  }

  /**
   * 구글이 준 ID Token 을 서버로 넘긴다.
   *
   * 응답이 일반 로그인과 동일하므로 성공 후 처리도 같다.
   * 팝업을 그냥 닫으면 콜백이 오지 않으므로 이 화면에 그대로 남는다.
   */
  const submitGoogleLogin = async (idToken: string) => {
    const isLoggedIn = await loginWithGoogle(idToken)
    if (!isLoggedIn) return

    finishLogin()
  }

  return (
    <MobileScreen
      header={
        <button
          type="button"
          aria-label={t('auth.login.back')}
          onClick={goBack}
          className="text-ink -ml-1.5 flex size-9 items-center justify-center"
        >
          <BackIcon />
        </button>
      }
    >
      <section className="pt-[clamp(8px,2vh,20px)]">
        <AppLogo size="clamp(52px,15vw,64px)" />
        <h1 className="text-ink mt-[clamp(16px,3vh,24px)] text-[clamp(24px,7.5vw,30px)] leading-none font-bold">
          {t('auth.login.title')}
        </h1>
        <p className="text-ink-muted mt-3 text-[clamp(13px,3.8vw,14px)]">
          {t('auth.login.subtitle')}
        </p>
      </section>

      {/*
        이메일 로그인이 먼저다.

        구글 세션이 있는 사용자에게는 GIS 가 아바타·계정명·이메일이 든 개인화
        버튼을 그린다. 그게 화면 맨 위에 있으면 두 줄짜리 카드가 제목 바로
        아래를 차지해 기본 로그인 폼보다 무거워 보인다. 화면 제목·부제가
        "이메일과 비밀번호로 로그인하세요" 인 것과도 순서가 어긋난다.
      */}
      <form
        className="mt-[clamp(20px,4.5vh,34px)]"
        onSubmit={(event) => void submitLogin(event)}
        noValidate
      >
        <div className="flex flex-col gap-[clamp(14px,3vh,20px)]">
          <AuthTextField
            label={t('auth.login.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AuthTextField
            label={t('auth.login.password')}
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.login.passwordPlaceholder')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {errorKey ? (
          <p role="alert" className="text-danger mt-4 text-[12.5px]">
            {t(errorKey)}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!isSubmittable}
          className="mt-[clamp(20px,4.5vh,32px)]"
        >
          {t('auth.login.title')}
        </Button>
      </form>

      {/* 구분선 가운데에 "또는 구글 계정으로" */}
      <div className="mt-[clamp(18px,4vh,28px)] flex items-center gap-3">
        <span aria-hidden className="bg-line h-px flex-1" />
        <span className="text-ink-muted text-[12.5px]">
          {t('auth.login.orGoogle')}
        </span>
        <span aria-hidden className="bg-line h-px flex-1" />
      </div>

      <div className="mt-[clamp(18px,4vh,28px)]">
        <GoogleLoginButton
          onCredential={(idToken) => void submitGoogleLogin(idToken)}
          isPending={isGooglePending}
          errorKey={googleErrorKey}
        />
      </div>

      <div className="mt-[clamp(16px,3.5vh,24px)] flex flex-col items-center gap-[clamp(10px,2vh,16px)] pb-6">
        <button
          type="button"
          onClick={() => void navigate('/password-reset')}
          className="text-ink-muted text-[13px]"
        >
          {t('auth.login.forgotPassword')}
        </button>

        <p className="text-ink-muted flex items-center gap-2 text-[13px]">
          {t('auth.login.noAccount')}
          <button
            type="button"
            onClick={() => void navigate('/signup')}
            className="text-brand-dark font-bold"
          >
            {t('auth.login.signUp')}
          </button>
        </p>
      </div>
    </MobileScreen>
  )
}
