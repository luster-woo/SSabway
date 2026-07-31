import { useTranslation } from 'react-i18next'

import { CheckIcon, InfoIcon } from '@/shared/ui'

export interface LocationConsentStatusProps {
  granted: boolean
  /** 가까운 역. 아직 못 받았으면 null */
  station?: string | null
  /** 카드로 되돌려 동의/비동의를 다시 고르게 한다. 비동의일 때만 쓰인다. */
  onChange: () => void
}

/**
 * 권한을 이미 선택한 뒤 카드를 대체하는 한 줄 요약.
 *
 * 동의한 상태에서는 되돌리기 버튼을 두지 않는다. 웹에는 권한을 취소하는 API 가
 * 없어서(Permissions API 에 revoke 가 없다) 브라우저에 남은 "이 사이트 허용"
 * 기록을 앱이 지울 방법이 없다. 즉 다시 눌러 「동의」 를 골라도 권한 창이 뜨지
 * 않고 캐시된 좌표가 즉시 돌아와, 사용자에게는 아무 일도 일어나지 않은 것으로
 * 보인다. 위치 사용을 정말 끊으려면 브라우저 사이트 설정에서 직접 해야 한다.
 *
 * 반대로 비동의 상태에서는 권한을 물어본 적이 없으므로 버튼이 의미가 있다.
 * 여기서 「동의로 바꾸기」 를 누르면 그때 권한 창이 처음 뜬다.
 */
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

      {granted ? null : (
        <button
          type="button"
          onClick={onChange}
          className="text-brand-dark focus-visible:ring-brand shrink-0 rounded text-[13px] font-bold underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('start.consent.switchToAllow')}
        </button>
      )}
    </div>
  )
}
