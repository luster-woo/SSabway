import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useLanguage } from '@/shared/lib/useLanguage'
import { Button, MobileScreen, useToast } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { InlineActionField } from '@/user/features/auth/InlineActionField'
import { formatDuration } from '@/user/features/auth/lib/formatDuration'
import { NoticeBanner } from '@/user/features/auth/NoticeBanner'
import {
  EMAIL_CHECK,
  useEmailAvailability,
} from '@/user/features/auth/useEmailAvailability'
import {
  CODE_LENGTH,
  normalizeCode,
  toLangCode,
  useEmailVerification,
  VERIFY_STEP,
} from '@/user/features/auth/useEmailVerification'
import { useGoBack } from '@/user/features/auth/useGoBack'
import { useSignUp } from '@/user/features/auth/useSignUp'

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
 * 7-3. 회원가입 — /signup
 *
 * 한 화면에서 네 단계를 순서대로 진행한다.
 *   1) 이메일 중복 확인  2) 인증 발송  3) 인증코드 확인  4) 비밀번호 설정
 *
 * 앞 단계를 통과하지 않으면 다음 단계가 열리지 않는다.
 * 가입 응답에 토큰이 없어 자동 로그인은 불가하므로 로그인 화면으로 보낸다.
 */
export default function SignUpPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const availability = useEmailAvailability()
  const verification = useEmailVerification('auth.signUp')
  const {
    signUp,
    isPending: isSigningUp,
    errorKey: signUpErrorKey,
  } = useSignUp()

  const isAvailable = availability.status === EMAIL_CHECK.AVAILABLE
  const isCodeSent = verification.step === VERIFY_STEP.SENT
  const isVerified = verification.step === VERIFY_STEP.VERIFIED

  /** 인증을 시작한 뒤에는 이메일을 바꿀 수 없게 잠근다. */
  const isEmailLocked = isCodeSent || isVerified

  /** 중복 확인 → 인증 발송이 이어 붙으므로 발송 중에도 잠가둔다. */
  const canCheckEmail =
    email.trim() !== '' &&
    !availability.isChecking &&
    !verification.isSending &&
    !isEmailLocked

  /** 만료된 뒤 다시 보내는 경우에만 쓰인다. 첫 발송은 중복 확인이 대신한다. */
  const canResendCode = isAvailable && !verification.isSending && !isCodeSent
  const canVerifyCode = code.length === CODE_LENGTH && !verification.isVerifying

  /**
   * 두 비밀번호 칸이 같은지 본다.
   *
   * 둘 다 type="password" 라 오타가 점으로 가려져 사용자가 볼 수 없다.
   * 여기서 막지 않으면 계정이 만들어진 뒤에야 로그인이 안 되는 것을 알게 되고,
   * 이미 가입돼 있어 다시 가입할 수도 없다.
   * 아직 다 입력하지 않은 동안 오류를 띄우지 않도록 확인란이 빈 경우는 제외한다.
   */
  const isMismatched = confirmPassword !== '' && password !== confirmPassword

  const canSubmit =
    isVerified &&
    password !== '' &&
    confirmPassword !== '' &&
    !isMismatched &&
    !isSigningUp

  /**
   * 실패 문구를 한 자리에서 보여준다.
   * 불일치는 서버에 보내기 전에 잡는 것이라 가장 앞에 둔다.
   */
  const errorKey = isMismatched
    ? 'auth.signUp.error.passwordMismatch'
    : (availability.errorKey ?? verification.errorKey ?? signUpErrorKey)

  /**
   * 이메일을 고치면 중복 확인 결과와 실패 문구를 함께 지운다.
   * 확인만 받아두고 다른 이메일로 가입하는 것을 막는다.
   *
   * status 를 보고 조건부로 지우면, 확인이 실패해 status 가 UNCHECKED 로
   * 되돌아간 경우에 문구만 남아 이메일을 고쳐도 옛 오류가 계속 보인다.
   * 이미 초기 상태면 setState 가 같은 값을 받아 렌더가 발생하지 않으므로
   * 조건 없이 부른다.
   */
  const changeEmail = (next: string) => {
    setEmail(next)
    availability.reset()
  }

  const sendCode = () => {
    void verification.sendCode({
      email: email.trim(),
      language: toLangCode(language),
    })
  }

  /**
   * 중복 확인에 통과하면 이어서 인증 메일까지 보낸다.
   *
   * 인증 발송 API 도 409(중복된 이메일)로 같은 검사를 하므로,
   * 두 버튼을 차례로 누르게 하면 사용자가 같은 검사를 두 번 통과하는 셈이 된다.
   * 중복이면 발송하지 않고 멈춰 불필요한 메일을 만들지 않는다.
   */
  const checkEmailAndSend = async () => {
    const isUsable = await availability.check(email.trim())
    if (!isUsable) return

    await verification.sendCode({
      email: email.trim(),
      language: toLangCode(language),
    })
  }

  /** 확인 → 발송이 한 버튼에서 이어지므로 진행 문구도 단계에 맞춰 바꾼다. */
  const checkActionLabel = () => {
    if (availability.isChecking) return t('auth.signUp.checking')
    if (verification.isSending) return t('auth.signUp.sending')
    return t('auth.signUp.checkEmail')
  }

  const verifyCode = () => {
    void verification.verifyCode({ email: email.trim(), code })
  }

  const submitSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    const isJoined = await signUp({
      email: email.trim(),
      password,
      language: toLangCode(language),
    })
    if (!isJoined) return

    showToast(t('auth.signUp.success'))
    void navigate('/login', { replace: true })
  }

  return (
    <MobileScreen
      header={
        <button
          type="button"
          aria-label={t('auth.signUp.back')}
          onClick={goBack}
          className="text-ink -ml-1.5 flex size-9 items-center justify-center"
        >
          <BackIcon />
        </button>
      }
    >
      <section className="pt-[clamp(4px,1.5vh,12px)]">
        <h1 className="text-ink text-[clamp(22px,6.8vw,27px)] leading-tight font-bold">
          {t('auth.signUp.title')}
        </h1>
        <p className="text-ink-muted mt-2.5 text-[clamp(12.5px,3.6vw,13.5px)]">
          {t('auth.signUp.subtitle')}
        </p>
      </section>

      <form
        className="mt-[clamp(16px,3.5vh,26px)] flex flex-col gap-[clamp(12px,2.6vh,18px)]"
        onSubmit={(event) => void submitSignUp(event)}
        noValidate
      >
        {/* 1단계 — 이메일 중복 확인. 통과하면 인증 메일 발송까지 이어진다. */}
        <InlineActionField
          label={t('auth.signUp.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('auth.signUp.emailPlaceholder')}
          value={email}
          readOnly={isEmailLocked}
          onChange={(event) => changeEmail(event.target.value)}
          actionLabel={checkActionLabel()}
          onAction={() => void checkEmailAndSend()}
          actionDisabled={!canCheckEmail}
        />

        {/* 확인은 통과했지만 발송이 실패한 경우(예: 429)에만 보인다. */}
        {isAvailable && !verification.hasRequested ? (
          <NoticeBanner>{t('auth.signUp.emailAvailable')}</NoticeBanner>
        ) : null}

        {/* 만료된 뒤에만 나타나는 재발송 버튼. 첫 발송은 위 버튼이 함께 처리한다. */}
        {verification.hasRequested && !isCodeSent && !isVerified ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!canResendCode}
            onClick={sendCode}
          >
            {verification.isSending
              ? t('auth.signUp.sending')
              : t('auth.signUp.resendCode')}
          </Button>
        ) : null}

        {isCodeSent ? (
          <NoticeBanner>{t('auth.signUp.codeSent')}</NoticeBanner>
        ) : null}

        {/*
          인증 완료. 서버가 인증 상태를 30분만 들고 있어 훅이 그 시간을 세지만,
          화면에는 노출하지 않는다. 만료되면 발송 전 단계로 되돌아가고 안내 문구가 뜬다.
        */}
        {isVerified ? (
          <NoticeBanner>{t('auth.signUp.codeVerified')}</NoticeBanner>
        ) : null}

        {/* 3단계 — 인증코드 확인. 명세대로 영문+숫자 7자리, 대소문자 구분 없음. */}
        {isCodeSent ? (
          <div className="flex flex-col gap-2">
            <InlineActionField
              label={t('auth.signUp.code')}
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_LENGTH}
              value={code}
              className="font-mono tracking-[0.3em]"
              onChange={(event) => setCode(normalizeCode(event.target.value))}
              actionLabel={
                verification.isVerifying
                  ? t('auth.signUp.verifying')
                  : t('auth.signUp.verifyCode')
              }
              onAction={verifyCode}
              actionDisabled={!canVerifyCode}
            />

            <p className="text-danger text-[12.5px] font-bold">
              {t('auth.signUp.remainingTime', {
                time: formatDuration(verification.remainingSec),
              })}
            </p>
          </div>
        ) : null}

        {/* 4단계 — 비밀번호. 인증 전에는 잠가둔다. */}
        <fieldset
          disabled={!isVerified}
          className="flex flex-col gap-[clamp(12px,2.6vh,18px)] border-0 p-0 disabled:opacity-45"
        >
          <AuthTextField
            label={t('auth.signUp.password')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.signUp.passwordPlaceholder')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthTextField
            label={t('auth.signUp.confirmPassword')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </fieldset>

        {errorKey ? (
          <p role="alert" className="text-danger text-[12.5px]">
            {t(errorKey)}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          className="mt-[clamp(4px,1.5vh,10px)]"
        >
          {isSigningUp ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
        </Button>
      </form>

      <p className="text-ink-muted mt-[clamp(14px,3vh,22px)] flex items-center justify-center gap-2 pb-6 text-[13px]">
        {t('auth.signUp.hasAccount')}
        <button
          type="button"
          onClick={() => void navigate('/login', { replace: true })}
          className="text-brand-dark font-bold"
        >
          {t('auth.signUp.signIn')}
        </button>
      </p>
    </MobileScreen>
  )
}
