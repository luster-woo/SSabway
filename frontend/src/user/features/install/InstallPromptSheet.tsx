import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { AppLogo, Button } from '@/shared/ui'
import type { InstallPromptVariant } from '@/user/features/install/useInstallPrompt'

export interface InstallPromptSheetProps {
  variant: InstallPromptVariant
  /** 퇴장 중인지. useInstallPrompt 의 LEAVE_MS 동안 유지된다. */
  leaving?: boolean
  onAccept: () => void
  onDismiss: () => void
}

/** 나가는 시간. useInstallPrompt 의 LEAVE_MS 와 같아야 한다 — 어긋나면 뚝 끊긴다. */
const LEAVE = 'duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]'
/** 들어오는 시간. 랜딩과 같은 감속 곡선으로 튀지 않게 멈춘다. */
const ENTER = 'duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)]'

function Step({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="bg-brand-soft text-brand-dark flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        aria-hidden
      >
        {index}
      </span>
      <span className="text-ink-muted text-[clamp(12px,3.6vw,13px)] leading-5">
        {children}
      </span>
    </li>
  )
}

/**
 * 앱 설치 유도 바텀시트 — 시작 페이지 하단을 덮는다.
 *
 * 두 가지 몸통을 가진다.
 *   'prompt' Install 버튼 → 브라우저의 설치 다이얼로그. (Chromium 계열)
 *   'manual' 「공유 → 홈 화면에 추가」 2단계 안내. iOS 는 설치 API 가 없어
 *            우리가 대신 눌러 줄 수 없고, 그림으로 알려주는 것이 전부다.
 *
 * 하단 CTA(「안내 시작」)를 가리므로 스크림을 깔고, 스크림·✕·「다음에」 어디로든
 * 닫을 수 있게 둔다. 필수 선택이 아니기 때문에 막아 세우지 않는다.
 *
 * 폰 규격을 유지해야 해서 랜딩과 같은 방식으로 fixed + max-w 컬럼 안에 넣는다.
 * (데스크톱에서 창 전체 폭으로 퍼지지 않는다)
 */
export function InstallPromptSheet({
  variant,
  leaving = false,
  onAccept,
  onDismiss,
}: InstallPromptSheetProps) {
  const { t } = useTranslation()
  const titleId = useId()

  /*
    첫 프레임을 아래(translate-y-full)에서 시작해야 올라오는 모션이 보인다.
    CSS 키프레임을 쓰면 animation-fill-mode 가 퇴장 transform 을 덮어써서
    나갈 때 순간이동한다 — 그래서 들어올 때도 transition 으로 처리한다.
  */
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onDismiss])

  const hiddenState = !entered || leaving
  const isManual = variant === 'manual'

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex justify-center',
        leaving && 'pointer-events-none',
      )}
    >
      <div
        // 스크림. 바깥을 눌러도 닫힌다.
        onClick={onDismiss}
        aria-hidden
        className={cn(
          'absolute inset-0 bg-black/45 transition-opacity motion-reduce:transition-none',
          leaving ? LEAVE : ENTER,
          hiddenState && 'opacity-0',
        )}
      />

      {/*
        폰 규격 컬럼. 화면 높이를 그대로 차지하므로 이 요소가 탭을 먹으면
        스크림(어두운 부분)을 눌러도 닫히지 않는다 — 클릭은 시트만 받는다.
      */}
      <div className="pointer-events-none relative w-full max-w-[430px]">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'bg-surface pointer-events-auto absolute inset-x-0 bottom-0',
            'rounded-t-3xl shadow-2xl',
            'px-[clamp(20px,6vw,24px)] pt-3.5',
            'pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]',
            'transition-transform motion-reduce:transition-none',
            leaving ? LEAVE : ENTER,
            hiddenState && 'translate-y-full',
          )}
        >
          <div aria-hidden className="bg-line mx-auto h-1 w-9 rounded-full" />

          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('install.close')}
            className="bg-surface-muted text-ink-muted absolute top-3 right-4 flex size-8 items-center justify-center rounded-full text-[13px]"
          >
            ✕
          </button>

          <div className="mt-4 flex items-center gap-3 pr-9">
            <AppLogo size="clamp(44px,12vw,52px)" />
            <div>
              <h2
                id={titleId}
                className="text-ink text-[clamp(15px,4.2vw,16px)] font-bold"
              >
                {t('install.title')}
              </h2>
              <p className="text-ink-muted mt-1 text-[clamp(12px,3.6vw,13px)] leading-5">
                {isManual
                  ? t('install.manualDescription')
                  : t('install.description')}
              </p>
            </div>
          </div>

          {isManual ? (
            <ol className="mt-4 space-y-2.5">
              <Step index={1}>{t('install.step1')}</Step>
              <Step index={2}>{t('install.step2')}</Step>
            </ol>
          ) : null}

          <Button size="lg" fullWidth className="mt-5" onClick={onAccept}>
            {isManual ? t('install.gotIt') : t('install.action')}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="mt-1"
            onClick={onDismiss}
          >
            {t('install.later')}
          </Button>
        </section>
      </div>
    </div>
  )
}
