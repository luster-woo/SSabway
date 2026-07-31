import { useTranslation } from 'react-i18next'

import { CheckIcon, InfoIcon } from '@/shared/ui'

export interface LocationConsentStatusProps {
  granted: boolean
  /** 가까운 역. 아직 못 받았으면 null */
  station?: string | null
  /** 다시 선택하도록 카드로 되돌린다 */
  onChange: () => void
}

/** 권한을 이미 선택한 뒤 카드를 대체하는 한 줄 요약 */
export function LocationConsentStatus({
  granted,
  station = null,
  onChange,
}: LocationConsentStatusProps) {
  const { t } = useTranslation()

  const StatusIcon = granted ? CheckIcon : InfoIcon

  /*
    역 이름을 받았으면 "동의했어요" 대신 그 결과를 보여준다.
    사용자가 알고 싶은 것은 동의 여부가 아니라 어디로 인식됐는가다.
  */
  const message =
    granted && station
      ? t('start.consent.nearStation', { station })
      : t(
          granted
            ? 'start.consent.statusAllowed'
            : 'start.consent.statusDenied',
        )

  return (
    <div className="border-line bg-surface-muted flex items-center gap-2.5 rounded-2xl border px-4 py-3">
      <StatusIcon className="text-brand size-4 shrink-0" aria-hidden />

      <p className="text-ink-muted flex-1 text-[clamp(12px,3.6vw,13px)] leading-5">
        {message}
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
