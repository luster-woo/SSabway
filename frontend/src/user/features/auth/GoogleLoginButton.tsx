import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { env } from '@/shared/lib/env'
import { loadGoogleIdentity } from '@/shared/lib/googleIdentity'
import { useLanguage } from '@/shared/lib/useLanguage'
import { FieldError } from '@/user/features/auth/FieldError'

/**
 * GIS 가 허용하는 버튼 폭의 범위.
 *
 * 폭은 담기는 자리의 실측값을 그대로 넘긴다 — 고정값(예전의 320)을 쓰면
 * 입력창·CTA 는 화면 폭을 꽉 채우는데 이 버튼만 좁게 가운데 떠서 좌우 끝이
 * 어긋난다. 특히 구글 세션이 있는 사용자에게는 아바타·계정명·이메일이 든
 * 개인화 버튼이 나와 그 어긋남이 더 눈에 띈다.
 *
 * 폰 규격(MobileViewport 최대 430px)에서 실측값은 288~398px 사이라 이 범위에
 * 자연히 들어오지만, 레이아웃이 바뀌어도 GIS 가 값을 무시하지 않도록 가둔다.
 */
const MIN_BUTTON_WIDTH = 200
const MAX_BUTTON_WIDTH = 400

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
 * ⚠️ 옵션에 있는 것은 폭·모양·테마·문구뿐이다. **높이(large=40px)와 모서리
 *    반경은 바꿀 수 없어** 우리 입력창·CTA(48~56px, rounded-2xl)와 정확히
 *    같아질 수 없다. 맞출 수 있는 것은 폭 하나뿐이라 그것만 실측해 맞춘다.
 *    완전히 통일하려면 oauth2 code 플로우로 바꾸고 버튼을 직접 그려야 하는데,
 *    그러면 서버가 idToken 대신 code 를 받아야 한다(BE 명세 변경).
 *
 * 구글 세션이 있는 사용자에게는 아바타·계정명·이메일이 든 **개인화 버튼**이
 * 대신 나온다. 이건 GIS 가 알아서 정하는 것이라 끌 수 없고, text 옵션
 * ('continue_with')도 그때는 무시된다.
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

  /**
   * 버튼을 담을 자리의 실측 폭. 0 이면 아직 재기 전이라 그리지 않는다.
   *
   * 컨테이너는 부모 폭을 그대로 받는 블록이고 iframe 은 그 안에 들어가므로
   * 자기 자신을 재도 되먹임이 생기지 않는다.
   */
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const next = Math.round(container.getBoundingClientRect().width)
      // 같은 값이면 상태를 건드리지 않는다 — 아래 이펙트가 버튼을 다시 그려
      // 깜빡인다. 회전·창 크기 변경처럼 실제로 폭이 달라질 때만 다시 그린다.
      setContainerWidth((prev) => (prev === next ? prev : next))
    }

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    measure()

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const container = containerRef.current
    if (containerWidth === 0) return

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
          width: Math.min(
            Math.max(containerWidth, MIN_BUTTON_WIDTH),
            MAX_BUTTON_WIDTH,
          ),
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
    // language 가 바뀌면 문구가, containerWidth 가 바뀌면 폭이 달라지므로
    // 두 경우 모두 버튼을 다시 그린다.
  }, [containerWidth, language])

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
