import { useTranslation } from 'react-i18next'

import { CheckIcon, InfoIcon } from '@/shared/ui'

export interface LocationConsentStatusProps {
  granted: boolean
  onChange: () => void
}

/** 권한을 이미 선택한 뒤 카드를 대체하는 한 줄 요약 */
export function LocationConsentStatus({
  granted,
  onChange,
}: LocationConsentStatusProps) {
  const { t } = useTranslation()
  const StatusIcon = granted ? CheckIcon : InfoIcon

  return (
    <div className="border-line bg-surface-muted flex items-center gap-2.5 rounded-2xl border px-4 py-3">
      <StatusIcon className="text-brand size-4 shrink-0" aria-hidden />
      <p className="text-ink-muted flex-1 text-[clamp(12px,3.6vw,13px)] leading-5">
        {granted
          ? t('start.consent.statusAllowed')
          : t('start.consent.statusDenied')}
      </p>
      <button
        type="button"
        onClick={onChange}
        className="text-brand-dark focus-visible:ring-brand shrink-0 rounded text-[13px] font-bold underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {t('start.consent.change')}
      </button>
    </div>
  )
}
