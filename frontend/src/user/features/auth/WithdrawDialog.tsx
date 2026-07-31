import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'
import { AuthTextField } from '@/user/features/auth/AuthTextField'
import { FieldError } from '@/user/features/auth/FieldError'
import { useWithdraw } from '@/user/features/auth/useWithdraw'

export interface WithdrawDialogProps {
  /** 성공·취소 모두 이 콜백으로 닫는다. 토큰 정리는 훅이 이미 마쳤다. */
  onClose: () => void
}

/**
 * 회원 탈퇴 확인 다이얼로그.
 *
 * 탈퇴는 명세상 현재 비밀번호를 요구하므로(PATCH /users) 여기서 입력받는다.
 * 실패하면 입력란을 비우고 문구를 띄운다. 성공하면 완료 화면으로 바꾼 뒤
 * 확인을 눌러 닫는다.
 *
 * 오버레이 구조는 consultation/CallDialog 와 같다. user 앱에 공용 모달이
 * 아직 없어 기능 안에 둔다. 세 번째 모달이 생기면 shared/ui 로 올릴 것.
 */
export function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()

  const [password, setPassword] = useState('')
  const [isDone, setIsDone] = useState(false)
  const { withdraw, isPending, errorKey } = useWithdraw()

  const canSubmit = password !== '' && !isPending

  // 성공 화면에서는 Escape 로 닫아도 되지만, 입력 중에는 요청이 나간 뒤
  // 화면만 닫히는 오해를 막기 위해 진행 중(isPending)일 때는 닫지 않는다.
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isPending, onClose])

  const submitWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    const isSucceeded = await withdraw(password)

    // 성공·실패 모두 입력값을 비운다. 실패 시 재입력을 유도하고,
    // 성공 시 비밀번호를 상태에 남겨두지 않는다.
    setPassword('')
    if (isSucceeded) setIsDone(true)
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/45 px-[clamp(24px,8vw,40px)]',
      )}
      onClick={isPending ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // 카드 내부 클릭이 배경으로 전파되어 닫히는 것을 막는다.
        onClick={(event) => event.stopPropagation()}
        className="bg-surface w-full max-w-[340px] rounded-3xl px-6 py-7 shadow-2xl"
      >
        {isDone ? (
          <>
            <h2 id={titleId} className="text-ink text-center text-[17px] font-bold">
              {t('auth.withdraw.success')}
            </h2>
            <Button
              size="lg"
              fullWidth
              className="mt-6"
              onClick={onClose}
            >
              {t('auth.withdraw.confirm')}
            </Button>
          </>
        ) : (
          <>
            <h2 id={titleId} className="text-ink text-center text-[17px] font-bold">
              {t('auth.withdraw.title')}
            </h2>
            <p className="text-ink-muted mt-2.5 text-center text-[13px] leading-5">
              {t('auth.withdraw.description')}
            </p>

            <form
              className="mt-5"
              onSubmit={(event) => void submitWithdraw(event)}
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

              <div className="mt-5 flex gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={isPending}
                  onClick={onClose}
                >
                  {t('auth.withdraw.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  disabled={!canSubmit}
                  className="bg-danger bg-none"
                >
                  {isPending
                    ? t('auth.withdraw.submitting')
                    : t('auth.withdraw.submit')}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
