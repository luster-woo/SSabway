import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useLanguage } from '@/shared/lib/useLanguage'
import { Button, MobileScreen, useToast } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { FieldError } from '@/user/features/auth/FieldError'
import { InlineActionField } from '@/user/features/auth/InlineActionField'
import { formatDuration } from '@/user/features/auth/lib/formatDuration'
import { NoticeBanner } from '@/user/features/auth/NoticeBanner'
import {
  CODE_LENGTH,
  normalizeCode,
  toLangCode,
  useEmailVerification,
  VERIFY_STEP,
} from '@/user/features/auth/useEmailVerification'
import { useGoBack } from '@/user/features/auth/useGoBack'
import { usePasswordReset } from '@/user/features/auth/usePasswordReset'

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
 * 7-2. 비밀번호 재설정 — /password-reset
 *
 * 한 화면에서 세 단계를 순서대로 진행한다.
 *   1) 이메일 인증 발송   2) 인증번호 확인   3) 새 비밀번호 입력
 *
 * 인증이 끝나기 전에는 비밀번호 칸을 잠가 순서를 건너뛰지 못하게 한다.
 * 변경에 성공하면 새 비밀번호로 다시 로그인해야 하므로 로그인 화면으로 보낸다.
 */
export default function PasswordResetPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const verification = useEmailVerification('auth.passwordReset')
  const {
    reset,
    isPending: isResetting,
    errorKey: resetErrorKey,
  } = usePasswordReset()

  const isVerified = verification.step === VERIFY_STEP.VERIFIED
  const isCodeSent = verification.step === VERIFY_STEP.SENT

  /** 인증이 끝나기 전에는 이메일을 바꿀 수 없게 잠근다. */
  const isEmailLocked = isCodeSent || isVerified
  const canSendCode = email.trim() !== '' && !verification.isSending
  /** 명세의 7자리를 다 채워야 확인을 누를 수 있다. */
  const canVerifyCode = code.length === CODE_LENGTH && !verification.isVerifying
  /**
   * 두 비밀번호 칸이 같은지 본다.
   *
   * 둘 다 type="password" 라 오타가 점으로 가려져 사용자가 볼 수 없다.
   * 여기서 막지 않으면 본인이 모르는 비밀번호로 바뀌어 로그인할 수 없게 된다.
   * 아직 다 입력하지 않은 동안 오류를 띄우지 않도록 확인란이 빈 경우는 제외한다.
   */
  const isMismatched = confirmPassword !== '' && newPassword !== confirmPassword

  const canSubmit =
    isVerified &&
    newPassword !== '' &&
    confirmPassword !== '' &&
    !isMismatched &&
    !isResetting

  /**
   * 실패 문구는 원인이 된 입력칸 바로 아래에 붙인다.
   * 화면 아래 한 곳에 모으면 어느 칸을 고쳐야 하는지 알기 어렵다.
   *
   * 인증 훅의 errorKey 는 발송 실패와 검증 실패를 함께 쓴다.
   * 발송 실패는 인증코드 칸이 열리기 전이므로(isCodeSent === false)
   * 이 값으로 두 실패를 갈라 각각 이메일·인증코드 칸에 붙인다.
   */
  const emailErrorKey = isCodeSent ? null : verification.errorKey
  const codeErrorKey = isCodeSent ? verification.errorKey : null

  /** 어느 칸이라고 짚을 수 없는 실패. 불일치는 서버에 보내기 전에 잡는다. */
  const formErrorKey = isMismatched
    ? 'auth.passwordReset.error.passwordMismatch'
    : resetErrorKey

  const sendCode = () => {
    void verification.sendCode({
      email: email.trim(),
      language: toLangCode(language),
    })
  }

  /** 만료 후 다시 누르는 경우는 "재발송"으로 문구를 바꿔준다. */
  const sendActionLabel = () => {
    if (verification.isSending) return t('auth.passwordReset.sending')
    if (verification.hasRequested) return t('auth.passwordReset.resendCode')
    return t('auth.passwordReset.sendCode')
  }

  const verifyCode = () => {
    void verification.verifyCode({ email: email.trim(), code })
  }

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    const isChanged = await reset({ email: email.trim(), newPassword })
    if (!isChanged) return

    showToast(t('auth.passwordReset.success'))
    void navigate('/login', { replace: true })
  }

  return (
    <MobileScreen
      header={
        <button
          type="button"
          aria-label={t('auth.passwordReset.back')}
          onClick={goBack}
          className="text-ink -ml-1.5 flex size-9 items-center justify-center"
        >
          <BackIcon />
        </button>
      }
    >
      <section className="pt-[clamp(4px,1.5vh,12px)]">
        <h1 className="text-ink text-[clamp(22px,6.8vw,27px)] leading-tight font-bold">
          {t('auth.passwordReset.title')}
        </h1>
        <p className="text-ink-muted mt-2.5 text-[clamp(12.5px,3.6vw,13.5px)]">
          {t('auth.passwordReset.subtitle')}
        </p>
      </section>

      <form
        className="mt-[clamp(16px,3.5vh,26px)] flex flex-col gap-[clamp(12px,2.6vh,18px)]"
        onSubmit={(event) => void submitReset(event)}
        noValidate
      >
        {/* 1단계 — 이메일 인증 발송. 만료되면 문구가 재발송으로 바뀐다. */}
        <InlineActionField
          label={t('auth.passwordReset.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('auth.passwordReset.emailPlaceholder')}
          value={email}
          readOnly={isEmailLocked}
          onChange={(event) => setEmail(event.target.value)}
          actionLabel={sendActionLabel()}
          onAction={sendCode}
          actionDisabled={!canSendCode || isEmailLocked}
        />

        {emailErrorKey ? <FieldError>{t(emailErrorKey)}</FieldError> : null}

        {isCodeSent ? (
          <NoticeBanner>{t('auth.passwordReset.codeSent')}</NoticeBanner>
        ) : null}

        {/*
          인증 완료. 서버가 인증 상태를 30분만 들고 있어 훅이 그 시간을 세지만,
          화면에는 노출하지 않는다. 만료되면 발송 전 단계로 되돌아가고 안내 문구가 뜬다.
        */}
        {isVerified ? (
          <NoticeBanner>{t('auth.passwordReset.codeVerified')}</NoticeBanner>
        ) : null}

        {/*
          2단계 — 인증번호 확인.
          명세대로 영문+숫자 7자리만 받는다. 대소문자는 구분하지 않으므로
          입력한 그대로 두고 서버 비교에 맡긴다.
        */}
        {isCodeSent ? (
          <div className="flex flex-col gap-2">
            <InlineActionField
              label={t('auth.passwordReset.code')}
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
                  ? t('auth.passwordReset.verifying')
                  : t('auth.passwordReset.verifyCode')
              }
              onAction={verifyCode}
              actionDisabled={!canVerifyCode}
            />

            {codeErrorKey ? <FieldError>{t(codeErrorKey)}</FieldError> : null}

            <p className="text-danger text-[12.5px] font-bold">
              {t('auth.passwordReset.remainingTime', {
                time: formatDuration(verification.remainingSec),
              })}
            </p>
          </div>
        ) : null}

        {/* 3단계 — 새 비밀번호. 인증 전에는 잠가둔다. */}
        <fieldset
          disabled={!isVerified}
          className="flex flex-col gap-[clamp(12px,2.6vh,18px)] border-0 p-0 disabled:opacity-45"
        >
          <AuthTextField
            label={t('auth.passwordReset.newPassword')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <AuthTextField
            label={t('auth.passwordReset.confirmPassword')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </fieldset>

        {formErrorKey ? <FieldError>{t(formErrorKey)}</FieldError> : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          className="mt-[clamp(4px,1.5vh,10px)]"
        >
          {isResetting
            ? t('auth.passwordReset.submitting')
            : t('auth.passwordReset.submit')}
        </Button>
      </form>

      <p className="text-ink-muted mt-[clamp(14px,3vh,22px)] flex items-center justify-center gap-2 pb-6 text-[13px]">
        {t('auth.passwordReset.rememberedPassword')}
        <button
          type="button"
          onClick={() => void navigate('/login', { replace: true })}
          className="text-brand-dark font-bold"
        >
          {t('auth.passwordReset.signIn')}
        </button>
      </p>
    </MobileScreen>
  )
}
