import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button, useToast } from '@/shared/ui'
import { CallControls } from '@/user/features/consultation/CallControls'
import { CallDialog } from '@/user/features/consultation/CallDialog'
import { CameraStage } from '@/user/features/consultation/CameraStage'
import { ConnectedBadge } from '@/user/features/consultation/ConnectedBadge'
import { toCallMediaErrorKey } from '@/user/features/consultation/callMediaErrorKey'
import {
  CALL_MEDIA_STATUS,
  useCallMedia,
} from '@/user/features/consultation/useCallMedia'

/** 마이크 권한 안내 모달의 아이콘 */
function MicBadgeIcon() {
  return (
    <span className="bg-brand-soft flex size-14 items-center justify-center rounded-full">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="text-brand-dark size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2.5" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
        <path d="M12 17.5V21" />
      </svg>
    </span>
  )
}

/**
 * 8. 화상 페이지 — /consultation
 *
 * 후면 카메라로 표지판을 비추면서 역무원과 통화한다.
 * 진입하면 먼저 권한 안내 모달을 띄우고, [허용] 을 누르면 브라우저 권한 팝업이 뜬다.
 *
 * TODO: OpenVidu 연동 시 스트림을 publish 하고 역무원 음성을 재생한다.
 * TODO: 얼굴 모자이크(선택지 A)는 이 화면에서 canvas 로 처리한 뒤 publish 한다.
 */
export default function ConsultationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const {
    status,
    errorType,
    stream,
    isMicOn,
    isCameraOn,
    start,
    toggleMic,
    toggleCamera,
    stop,
  } = useCallMedia()

  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)

  const isStreaming = status === CALL_MEDIA_STATUS.STREAMING
  const isRequesting = status === CALL_MEDIA_STATUS.REQUESTING

  const denyPermission = () => {
    showToast(t('consultation.video.permission.denied'))
    void navigate('/', { replace: true })
  }

  const changeMic = () => {
    toggleMic()
    showToast(
      isMicOn ? t('consultation.video.micOff') : t('consultation.video.micOn'),
    )
  }

  const changeCamera = () => {
    toggleCamera()
    showToast(
      isCameraOn
        ? t('consultation.video.cameraOff')
        : t('consultation.video.cameraOn'),
    )
  }

  const endCall = () => {
    stop()
    setIsEndDialogOpen(false)
    showToast(t('consultation.video.ended'))
    // TODO: 실제로는 경로 안내 중이었으면 도착 화면으로 돌아가야 한다.
    void navigate('/arrival', { replace: true })
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <CameraStage stream={stream} isCameraOn={isCameraOn} />

      <div className="px-safe relative flex flex-1 flex-col">
        <header className="flex shrink-0 flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <ConnectedBadge isConnected={isStreaming} />
          <p className="rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
            {t('consultation.video.faceBlurOn')}
          </p>
        </header>

        <footer className="mt-auto flex shrink-0 justify-center pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
          {isStreaming ? (
            <CallControls
              isMicOn={isMicOn}
              isCameraOn={isCameraOn}
              onToggleMic={changeMic}
              onToggleCamera={changeCamera}
              onEnd={() => setIsEndDialogOpen(true)}
            />
          ) : null}
        </footer>
      </div>

      {status === CALL_MEDIA_STATUS.IDLE || isRequesting ? (
        <CallDialog
          header={<MicBadgeIcon />}
          title={t('consultation.video.permission.title')}
          description={t('consultation.video.permission.description')}
        >
          <Button
            size="lg"
            fullWidth
            disabled={isRequesting}
            onClick={() => void start()}
          >
            {isRequesting
              ? t('consultation.video.permission.requesting')
              : t('consultation.video.permission.allow')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={isRequesting}
            onClick={denyPermission}
          >
            {t('consultation.video.permission.deny')}
          </Button>
        </CallDialog>
      ) : null}

      {status === CALL_MEDIA_STATUS.ERROR && errorType ? (
        <CallDialog
          title={t('consultation.video.permission.title')}
          description={t(toCallMediaErrorKey(errorType))}
        >
          <Button size="lg" fullWidth onClick={() => void start()}>
            {t('common.retry')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => void navigate('/', { replace: true })}
          >
            {t('common.goHome')}
          </Button>
        </CallDialog>
      ) : null}

      {isEndDialogOpen ? (
        <CallDialog
          isDismissable
          title={t('consultation.video.endConfirm.title')}
          description={t('consultation.video.endConfirm.description')}
          onClose={() => setIsEndDialogOpen(false)}
        >
          <Button size="lg" fullWidth onClick={endCall}>
            {t('consultation.video.endConfirm.confirm')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setIsEndDialogOpen(false)}
          >
            {t('consultation.video.endConfirm.keep')}
          </Button>
        </CallDialog>
      ) : null}
    </div>
  )
}
