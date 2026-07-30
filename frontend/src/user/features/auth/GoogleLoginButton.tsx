import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

/** Google 브랜드 색을 그대로 쓴 G 마크 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1.01v2.34A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.96H1.01a9 9 0 0 0 0 8.08l2.96-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 1.01 4.96l2.96 2.32C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

export interface GoogleLoginButtonProps {
  onClick: () => void
}

/**
 * Google 로그인 버튼.
 *
 * API 명세서의 `/api/v1/users/login/google` 이 "(보류)" 상태라
 * 지금은 눌러도 준비 중 안내만 띄운다.
 * TODO: OAuth 도입이 확정되면 실제 인증 흐름을 연결한다.
 */
export function GoogleLoginButton({ onClick }: GoogleLoginButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-line bg-surface text-ink relative flex w-full items-center justify-center',
        'h-[clamp(48px,14vw,56px)] rounded-2xl border font-bold',
        'text-[clamp(14px,4vw,15px)] transition active:brightness-95',
        'focus-visible:ring-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      )}
    >
      {/* 아이콘은 왼쪽에 고정하고 글자는 버튼 가운데에 둔다 */}
      <span className="absolute left-5">
        <GoogleMark />
      </span>
      {t('auth.login.google')}
    </button>
  )
}
