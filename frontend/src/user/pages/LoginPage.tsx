import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppLogo, Button, MobileScreen, useToast } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { GoogleLoginButton } from '@/user/features/auth/GoogleLoginButton'
import { useGoBack } from '@/user/features/auth/useGoBack'
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
 * 로그인에 성공하거나 뒤로가기를 누르면 진입한 화면으로 되돌아간다. (useGoBack)
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isPending, errorKey } = useUserLogin()

  const isSubmittable = email.trim() !== '' && password !== '' && !isPending

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmittable) return

    const isLoggedIn = await login({ email: email.trim(), password })
    if (!isLoggedIn) return

    showToast(t('auth.login.success'))
    goBack()
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

      <div className="mt-[clamp(20px,4.5vh,34px)]">
        <GoogleLoginButton
          onClick={() => showToast(t('auth.login.googlePending'))}
        />
      </div>

      {/* 구분선 가운데에 "또는 이메일로" */}
      <div className="mt-[clamp(18px,4vh,28px)] flex items-center gap-3">
        <span aria-hidden className="bg-line h-px flex-1" />
        <span className="text-ink-muted text-[12.5px]">
          {t('auth.login.orEmail')}
        </span>
        <span aria-hidden className="bg-line h-px flex-1" />
      </div>

      <form
        className="mt-[clamp(18px,4vh,28px)]"
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
