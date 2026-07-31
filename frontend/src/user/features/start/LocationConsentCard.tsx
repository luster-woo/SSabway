import { useTranslation } from 'react-i18next'

import { Button, Card } from '@/shared/ui'

export interface LocationConsentCardProps {
  onAllow: () => void
  onDeny: () => void
  /** 위치를 잡는 중. 지하에서는 몇 초 걸리므로 중복 요청을 막는다. */
  isRequesting?: boolean
}

function ConsentBullet({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="bg-brand mt-[7px] size-2 shrink-0 rounded-full"
        aria-hidden
      />
      <span className="text-ink-muted text-[clamp(12px,3.6vw,13px)] leading-5">
        {children}
      </span>
    </li>
  )
}

/** 위치 정보 접근 권한 안내 + 동의/비동의 선택 카드 */
export function LocationConsentCard({
  onAllow,
  onDeny,
  isRequesting = false,
}: LocationConsentCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="p-[clamp(16px,4.5vw,20px)]">
      <div className="flex items-center gap-3">
        <span
          className="bg-brand-soft text-brand-dark flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
          aria-hidden
        >
          !
        </span>
        <h2 className="text-ink text-[clamp(15px,4.2vw,16px)] font-bold">
          {t('start.consent.title')}
        </h2>
      </div>

      <ul className="mt-4 space-y-2.5">
        <ConsentBullet>{t('start.consent.allowHint')}</ConsentBullet>
        <ConsentBullet>{t('start.consent.denyHint')}</ConsentBullet>
      </ul>

      <div className="mt-5 flex gap-3">
        <Button className="flex-1" disabled={isRequesting} onClick={onAllow}>
          {isRequesting
            ? t('start.consent.requesting')
            : t('start.consent.allow')}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={isRequesting}
          onClick={onDeny}
        >
          {t('start.consent.deny')}
        </Button>
      </div>
    </Card>
  )
}
