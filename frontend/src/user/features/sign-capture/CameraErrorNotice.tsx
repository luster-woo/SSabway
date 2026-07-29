import { useRef, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui'
import {
  CAMERA_ERROR,
  type CameraErrorType,
} from '@/user/features/sign-capture/hooks/useCameraStream'

const ERROR_KEY: Record<CameraErrorType, string> = {
  [CAMERA_ERROR.INSECURE_CONTEXT]: 'signCapture.error.insecure',
  [CAMERA_ERROR.PERMISSION_DENIED]: 'signCapture.error.denied',
  [CAMERA_ERROR.NOT_FOUND]: 'signCapture.error.notFound',
  [CAMERA_ERROR.IN_USE]: 'signCapture.error.inUse',
  [CAMERA_ERROR.UNKNOWN]: 'signCapture.error.unknown',
}

export interface CameraErrorNoticeProps {
  errorType: CameraErrorType
  onRetry: () => void
  /** 카메라를 못 쓰는 환경용 폴백 — 갤러리에서 표지판 사진 선택 */
  onSelectImage: (file: File) => void
}

/** 카메라 시작 실패 안내 + 재시도/사진 업로드 폴백 */
export function CameraErrorNotice({
  errorType,
  onRetry,
  onSelectImage,
}: CameraErrorNoticeProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelectImage(file)
    event.target.value = ''
  }

  // 권한 거부는 재시도해도 브라우저가 다시 묻지 않는 경우가 많다 —
  // 설정 변경 안내가 본문에 있으므로 재시도 버튼은 그대로 둔다.
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#15181c] px-8 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-white/10 text-2xl"
      >
        📷
      </span>
      <p className="text-[15px] leading-6 font-bold whitespace-pre-line text-white">
        {t(ERROR_KEY[errorType])}
      </p>

      <div className="flex w-full max-w-[280px] flex-col gap-2.5">
        <Button fullWidth onClick={onRetry}>
          {t('common.retry')}
        </Button>
        <Button
          fullWidth
          variant="secondary"
          className="border-[#3a424c] bg-transparent text-white"
          onClick={() => fileInputRef.current?.click()}
        >
          {t('signCapture.error.upload')}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
