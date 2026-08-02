import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui'
import {
  LOAD_ERROR,
  type LoadErrorType,
} from '@/user/features/destination-search/lib/loadGoogleMaps'

export interface MapLoadErrorNoticeProps {
  errorType: LoadErrorType
  onRetry: () => void
}

const MESSAGE_KEY: Record<LoadErrorType, string> = {
  [LOAD_ERROR.MISSING_KEY]: 'destination.error.missingKey',
  [LOAD_ERROR.AUTH_FAILED]: 'destination.error.authFailed',
  [LOAD_ERROR.SCRIPT_ERROR]: 'destination.error.mapFailed',
}

/** 지도 SDK를 못 받았을 때 지도 자리를 대신 채우는 안내. */
export function MapLoadErrorNotice({
  errorType,
  onRetry,
}: MapLoadErrorNoticeProps) {
  const { t } = useTranslation()

  // 설정이 잘못된 경우는 다시 눌러도 결과가 같으므로 재시도를 노출하지 않는다.
  const canRetry = errorType === LOAD_ERROR.SCRIPT_ERROR

  return (
    <div className="bg-surface-muted absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-ink-muted text-[13.5px] leading-5 whitespace-pre-line">
        {t(MESSAGE_KEY[errorType])}
      </p>
      {canRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
