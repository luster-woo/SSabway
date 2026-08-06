import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { PROVIDER, type UserMe } from '@/shared/types/user'
import { Button } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { FieldError } from '@/user/features/auth/FieldError'
import { useUserMe } from '@/user/features/auth/useUserMe'
import { useWithdraw } from '@/user/features/auth/useWithdraw'

export interface WithdrawDialogProps {
  /** 성공·취소 모두 이 콜백으로 닫는다. 토큰 정리는 훅이 이미 마쳤다. */
  onClose: () => void
}

/**
 * 화면 단계.
 *   loading    GET /users/me 조회 중. 아직 모달을 띄우지 않는다(무엇을 물을지 모른다)
 *   loadFailed 조회 실패 — 다시 시도
 *   confirm    "어느 계정을 지우는지" 확인
 *   password   일반 로그인(LOCAL) 계정의 비밀번호 확인
 *   done       완료
 */
const STEP = {
  loading: 'loading',
  loadFailed: 'loadFailed',
  confirm: 'confirm',
  password: 'password',
  done: 'done',
} as const

type Step = (typeof STEP)[keyof typeof STEP]

/**
 * 회원 탈퇴 흐름.
 *
 * 열리자마자 `GET /users/me` 를 부른다. 프론트는 이메일도 가입 경로도 들고
 * 있지 않아서(로그인 훅이 입력받은 이메일을 보내고 버린다) 이 응답이 유일한
 * 출처다. 응답이 오기 전에는 모달을 띄우지 않는다 — 무엇을 물어야 할지
 * 모르는 채로 껍데기를 먼저 보여줄 이유가 없다.
 *
 *   [회원탈퇴] → 조회 → 확인("abc@test.com 계정을 탈퇴합니다")
 *     ├ GOOGLE : 확인 즉시 탈퇴 (비밀번호가 없으므로 물을 것이 없다)
 *     └ LOCAL  : 비밀번호 입력 → 탈퇴
 *
 * 구글 계정에서 비밀번호라는 마찰이 사라지므로, 확인 단계가 그 자리를 대신한다.
 * BE 도 같은 전제다 — `UserService.withdraw` 주석: "소셜 가입자는 password_hash가
 * NULL이라 확인할 수단이 없으므로, 서버는 토큰만 신뢰하고 확인 절차는 프론트에 맡김".
 * 그래서 이 단계에서 지울 계정의 이메일을 반드시 보여준다.
 *
 * 오버레이 구조는 consultation/CallDialog 와 같다. user 앱에 공용 모달이
 * 아직 없어 기능 안에 둔다. 세 번째 모달이 생기면 shared/ui 로 올릴 것.
 */
export function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()

  const [step, setStep] = useState<Step>(STEP.loading)
  const [account, setAccount] = useState<UserMe | null>(null)
  const [password, setPassword] = useState('')

  const { load } = useUserMe()
  const { withdraw, isPending, errorKey } = useWithdraw()

  const loadAccount = useCallback(async () => {
    setStep(STEP.loading)

    const me = await load()
    if (!me) {
      setStep(STEP.loadFailed)
      return
    }

    setAccount(me)
    setStep(STEP.confirm)
  }, [load])

  useEffect(() => {
    void loadAccount()
  }, [loadAccount])

  /*
    조회 중과 탈퇴 요청 중에는 닫히지 않게 한다.
    요청이 나간 뒤 화면만 닫히면 사용자는 취소된 것으로 오해한다.
  */
  const isBusy = step === STEP.loading || isPending

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isBusy, onClose])

  /**
   * 확인 단계의 [확인].
   *
   * 구글 계정은 여기가 마지막 관문이라 곧바로 탈퇴한다(보낼 비밀번호가 없다).
   * 일반 계정은 비밀번호 단계로 넘긴다.
   */
  const confirmAccount = async () => {
    if (!account || isPending) return

    if (account.provider === PROVIDER.LOCAL) {
      setStep(STEP.password)
      return
    }

    if (await withdraw(null)) setStep(STEP.done)
  }

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password === '' || isPending) return

    const isSucceeded = await withdraw(password)

    // 성공·실패 모두 입력값을 비운다. 실패 시 재입력을 유도하고,
    // 성공 시 비밀번호를 상태에 남겨두지 않는다.
    setPassword('')
    if (isSucceeded) setStep(STEP.done)
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/45 px-[clamp(24px,8vw,40px)]',
      )}
      onClick={isBusy ? undefined : onClose}
    >
      {step === STEP.loading ? (
        // 아직 모달이 아니다. 조회가 끝나야 무엇을 물을지 정해진다.
        <div role="status" className="flex flex-col items-center gap-3">
          <span
            aria-hidden
            className="size-10 animate-spin rounded-full border-4 border-white/25 border-t-white"
          />
          <p className="text-[13px] font-bold text-white">
            {t('auth.withdraw.loadingAccount')}
          </p>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          // 카드 내부 클릭이 배경으로 전파되어 닫히는 것을 막는다.
          onClick={(event) => event.stopPropagation()}
          className="bg-surface w-full max-w-[340px] rounded-3xl px-6 py-7 shadow-2xl"
        >
          <h2
            id={titleId}
            className="text-ink text-center text-[17px] font-bold"
          >
            {step === STEP.done
              ? t('auth.withdraw.success')
              : t('auth.withdraw.title')}
          </h2>

          {step === STEP.done ? (
            <Button size="lg" fullWidth className="mt-6" onClick={onClose}>
              {t('auth.withdraw.confirm')}
            </Button>
          ) : null}

          {step === STEP.loadFailed ? (
            <>
              <p className="text-ink-muted mt-2.5 text-center text-[13px] leading-5">
                {t('auth.withdraw.error.loadFailed')}
              </p>
              <DialogActions
                cancelLabel={t('auth.withdraw.cancel')}
                onCancel={onClose}
                submitLabel={t('common.retry')}
                onSubmit={() => void loadAccount()}
              />
            </>
          ) : null}

          {step === STEP.confirm && account ? (
            <>
              {/* 지울 계정을 반드시 보여준다. 구글 계정은 이 확인이 마지막 관문이다. */}
              <p className="text-ink mt-3 text-center text-[13.5px] leading-5 font-bold break-all">
                {t('auth.withdraw.accountNotice', { email: account.email })}
              </p>
              <p className="text-ink-muted mt-2 text-center text-[13px] leading-5">
                {t('auth.withdraw.confirmDescription')}
              </p>

              {errorKey ? (
                <div className="mt-3">
                  <FieldError>{t(errorKey)}</FieldError>
                </div>
              ) : null}

              <DialogActions
                cancelLabel={t('auth.withdraw.cancel')}
                onCancel={onClose}
                submitLabel={
                  isPending
                    ? t('auth.withdraw.submitting')
                    : t('auth.withdraw.confirm')
                }
                onSubmit={() => void confirmAccount()}
                isPending={isPending}
                danger
              />
            </>
          ) : null}

          {step === STEP.password ? (
            <>
              <p className="text-ink-muted mt-2.5 text-center text-[13px] leading-5">
                {t('auth.withdraw.description')}
              </p>

              <form
                className="mt-5"
                onSubmit={(event) => void submitPassword(event)}
                noValidate
              >
                <AuthTextField
                  label={t('auth.withdraw.password')}
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.withdraw.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                {errorKey ? (
                  <div className="mt-2">
                    <FieldError>{t(errorKey)}</FieldError>
                  </div>
                ) : null}

                <DialogActions
                  cancelLabel={t('auth.withdraw.cancel')}
                  onCancel={onClose}
                  submitLabel={
                    isPending
                      ? t('auth.withdraw.submitting')
                      : t('auth.withdraw.submit')
                  }
                  isSubmitType
                  isPending={isPending}
                  isDisabled={password === ''}
                  danger
                />
              </form>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

interface DialogActionsProps {
  cancelLabel: string
  onCancel: () => void
  submitLabel: string
  /** submit 타입이면 form 이 처리하므로 onSubmit 을 넘기지 않는다. */
  onSubmit?: () => void
  isSubmitType?: boolean
  isPending?: boolean
  isDisabled?: boolean
  danger?: boolean
}

/** [취소] [주 동작] 한 쌍. 세 단계가 같은 배치를 쓴다. */
function DialogActions({
  cancelLabel,
  onCancel,
  submitLabel,
  onSubmit,
  isSubmitType = false,
  isPending = false,
  isDisabled = false,
  danger = false,
}: DialogActionsProps): ReactNode {
  return (
    <div className="mt-5 flex gap-2">
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        disabled={isPending}
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type={isSubmitType ? 'submit' : 'button'}
        size="lg"
        fullWidth
        disabled={isPending || isDisabled}
        onClick={isSubmitType ? undefined : onSubmit}
        className={cn(danger && 'bg-danger bg-none')}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
