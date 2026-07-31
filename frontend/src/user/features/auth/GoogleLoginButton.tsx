import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { env } from '@/shared/lib/env'
import { loadGoogleIdentity } from '@/shared/lib/googleIdentity'
import { useLanguage } from '@/shared/lib/useLanguage'
import { FieldError } from '@/user/features/auth/FieldError'

/** 버튼 폭. GIS 가 허용하는 최대값은 400 이다. */
const BUTTON_WIDTH = 320

export interface GoogleLoginButtonProps {
  /** ID Token 을 받았을 때. 서버 전달은 호출한 쪽이 한다. */
  onCredential: (idToken: string) => void
  /** 로그인 요청 중. 버튼을 눌러도 반응하지 않게 덮는다. */
  isPending?: boolean
  /** 로그인 실패 문구의 i18n 키 */
  errorKey?: string | null
}

/**
 * 구글 로그인 버튼.
 *
 * 구글이 iframe 으로 직접 그린다. GIS 는 "커스텀 디자인 + ID Token" 조합을
 * 지원하지 않고 명세가 idToken 을 요구하므로 구글 기본 버튼을 쓴다.
 * 그래서 CSS 로 모양을 바꿀 수 없고 renderButton 옵션으로만 조절한다.
 *
 * 팝업 방식이라 페이지가 이탈하지 않는다. 전체 리다이렉트 방식은 PWA 에서
 * 앱이 재부팅되고 외부 브라우저로 나가버려 쓰지 않는다.
 */
export function GoogleLoginButton({
  onCredential,
  isPending = false,
  errorKey = null,
}: GoogleLoginButtonProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasFailed, setHasFailed] = useState(false)

  /**
   * 콜백을 ref 로 들고 있는다.
   *
   * initialize 에 넘긴 콜백은 GIS 내부에 갇힌다. 이 값이 바뀔 때마다 다시
   * 초기화하고 버튼을 다시 그리면 깜빡이므로, 항상 최신 함수를 부르도록
   * ref 로 우회한다.
   */
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential

  useEffect(() => {
    let isCancelled = false
    const container = containerRef.current

    loadGoogleIdentity()
      .then(() => {
        if (isCancelled || !container || !window.google) return

        window.google.accounts.id.initialize({
          client_id: env.GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
          cancel_on_tap_outside: true,
        })

        // StrictMode 이중 마운트로 버튼이 두 개 그려지는 것을 막는다.
        container.innerHTML = ''

        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: BUTTON_WIDTH,
          locale: language,
        })
      })
      .catch(() => {
        if (!isCancelled) setHasFailed(true)
      })

    return () => {
      isCancelled = true
      // 언마운트 시 iframe 을 걷어낸다. 남겨두면 다시 들어올 때 두 개가 된다.
      if (container) container.innerHTML = ''
    }
    // language 가 바뀌면 버튼 문구도 바뀌어야 하므로 다시 그린다.
  }, [language])

  /**
   * 스크립트 로드 실패(오프라인 등)이거나 클라이언트 ID 가 비어 있으면
   * 버튼을 그릴 수 없다. 빈 자리를 남기지 않고 안내 문구로 대체한다.
   */
  if (hasFailed || !env.GOOGLE_CLIENT_ID) {
    return (
      <p className="text-ink-muted text-center text-[12.5px]">
        {t('auth.login.googleUnavailable')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/*
        요청 중에는 버튼을 흐리게 하고 클릭을 막는다.
        iframe 안이라 disabled 속성을 넣을 수 없어 바깥에서 처리한다.
      */}
      <div
        ref={containerRef}
        aria-busy={isPending}
        className={
          isPending
            ? 'pointer-events-none flex justify-center opacity-60'
            : 'flex justify-center'
        }
      />

      {errorKey ? <FieldError>{t(errorKey)}</FieldError> : null}
    </div>
  )
}
