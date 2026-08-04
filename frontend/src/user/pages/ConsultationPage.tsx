import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CaptionOverlay } from '@/shared/caption/CaptionOverlay'
import { useLiveCaption } from '@/shared/caption/useLiveCaption'
import { useLanguage } from '@/shared/lib/useLanguage'
import { Button, useToast } from '@/shared/ui'
import { OpenViduVideo } from '@/shared/webrtc/OpenViduVideo'
import { OV_STATUS } from '@/shared/webrtc/useOpenViduSession'
import { CallControls } from '@/user/features/consultation/CallControls'
import { CallDialog } from '@/user/features/consultation/CallDialog'
import { CameraStage } from '@/user/features/consultation/CameraStage'
import { ConnectedBadge } from '@/user/features/consultation/ConnectedBadge'
import { toCallMediaErrorKey } from '@/user/features/consultation/callMediaErrorKey'
import {
  CALL_MEDIA_STATUS,
  useCallMedia,
} from '@/user/features/consultation/useCallMedia'
import { useConsultationCall } from '@/user/features/consultation/useConsultationCall'

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
 * 권한을 얻으면 그 스트림으로 OpenVidu 세션에 접속한다. 세션은 역무원이
 * 수락해야 생기므로 그때까지 대기 문구를 보여준다.
 *
 * TODO: 얼굴 모자이크(선택지 A)는 이 화면에서 canvas 로 처리한 뒤 publish 한다.
 *       지금은 원본 스트림을 그대로 발행한다.
 */
export default function ConsultationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  /*
    상담 ID.

    HelpChatPage 의 대기 화면이 상담 요청(POST /consultations) 응답으로 받은
    실제 ID 를 쿼리 파라미터에 실어 이 화면으로 넘긴다. 새로고침해도 URL 에
    남아 있어 재접속(joinSession)에 그대로 쓸 수 있다 — 그래서 라우팅 state가
    아니라 쿼리 파라미터를 택했다.
  */
  const consultationId = Number(searchParams.get('consultationId') ?? '0')

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

  const call = useConsultationCall(consultationId, stream)

  /*
    역무원 발화 자막. 역무원 음성(staffStream)을 사용자가 고른 언어로 번역해
    보여준다. 역무원은 한국어로 말한다는 전제라 sourceLang 은 'ko' 고정이다.
    (명세 /ws/v1/ai/translation 이 auto-detect 가 아니라 화자 언어를 요구한다)
  */
  const { language } = useLanguage()
  const staffAudioStream = useMemo(
    () => (call.staffStream ? call.staffStream.stream.getMediaStream() : null),
    [call.staffStream],
  )
  const caption = useLiveCaption(staffAudioStream, {
    speaker: 'ADMIN',
    sourceLang: 'ko',
    targetLang: language,
  })

  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)

  const isStreaming = status === CALL_MEDIA_STATUS.STREAMING
  const isRequesting = status === CALL_MEDIA_STATUS.REQUESTING

  /** 역무원 음성이 실제로 들어오고 있는지. 배지와 대기 문구가 이걸로 갈린다. */
  const isStaffConnected =
    call.status === OV_STATUS.CONNECTED && call.staffStream !== null

  const hasConsultationId = consultationId > 0

  /** 통화 화면 상단에 띄울 안내. 없으면 null */
  const callNotice = (() => {
    if (!hasConsultationId) return t('consultation.video.noConsultationId')
    if (call.isJoinFailed) return t('consultation.video.joinFailed')
    if (call.status === OV_STATUS.RECONNECTING) {
      return t('consultation.video.reconnecting')
    }
    if (call.isWaitingMatch) {
      // 대기 순번은 상태 API 가 붙어야 값이 들어온다. 없으면 문구만 보여준다.
      return call.queuePosition === null
        ? t('consultation.video.waitingStaff')
        : t('consultation.video.queuePosition', {
            position: call.queuePosition,
          })
    }
    if (call.status === OV_STATUS.CONNECTING) {
      return t('consultation.video.connecting')
    }
    return null
  })()

  const isNoticeAlert = call.isJoinFailed || !hasConsultationId

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

  /**
   * 역무원이 먼저 종료했을 때 이 화면도 함께 닫는다.
   *
   * 역무원이 [상담 종료] 를 누르면 서버가 OpenVidu 세션을 닫고, 그러면 이쪽
   * 클라이언트에 `sessionDisconnected` 가 와서 상태가 DISCONNECTED 가 된다.
   * 그 신호를 화면이 받지 않으면 통화가 끝났는데도 카메라가 계속 돌고 화면이
   * 그대로 남는다.
   *
   * 한 번 연결된 뒤의 DISCONNECTED 만 본다 — 접속 전 IDLE 상태와 구분해야
   * 하고, 사용자가 직접 끊은 경우는 endCall 이 이미 정리하고 이동했으므로
   * 여기까지 오지 않는다.
   */
  const hasConnectedRef = useRef(false)
  if (call.status === OV_STATUS.CONNECTED) hasConnectedRef.current = true

  useEffect(() => {
    if (!hasConnectedRef.current) return
    if (call.status !== OV_STATUS.DISCONNECTED) return

    stop()
    showToast(t('consultation.video.endedByStaff'))
    void navigate('/guide', { replace: true })
  }, [call.status, navigate, showToast, stop, t])

  const endCall = () => {
    /*
      연결을 먼저 끊고 장치를 반납한다. 순서가 반대면 이미 끝난 트랙을 발행하다
      OpenVidu 가 예외를 던진다.

      call.leave() 가 연결 해제와 함께 상담 종료 처리까지 맡는다 — 녹음 정지·
      세션 종료·ENDED 전이를 서버가 한 번에 한다(역무원의 [상담 종료] 와 같은
      API). 이게 없으면 상담이 활성 상태로 남아 다음 도움 요청이 409 로 막힌다.
      자세한 분기는 useConsultationCall 의 leaveCall 주석 참고.
    */
    call.leave()
    stop()
    setIsEndDialogOpen(false)
    showToast(t('consultation.video.ended'))
    /*
      경로 상세 안내로 돌아간다.
      진입 흐름이 경로 상세 → 도움 요청 → 챗봇 → 화상이므로, 상담이 끝나면
      사용자가 원래 받고 있던 길 안내로 복귀해야 한다. 챗봇으로 되돌리면
      안내를 이어가기 위해 한 단계를 더 눌러야 한다.
    */
    void navigate('/guide', { replace: true })
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <CameraStage stream={stream} isCameraOn={isCameraOn} />

      <div className="px-safe relative flex flex-1 flex-col">
        <header className="flex shrink-0 flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <ConnectedBadge isConnected={isStaffConnected} />
          <p className="rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
            {t('consultation.video.faceBlurOn')}
          </p>

          {callNotice ? (
            <p
              role={isNoticeAlert ? 'alert' : 'status'}
              className="mx-6 rounded-full bg-black/55 px-4 py-2 text-center text-[12.5px] text-white"
            >
              {callNotice}
            </p>
          ) : null}
        </header>

        {/*
          역무원 음성 재생. 역무원은 영상을 발행하지 않아 화면에 보일 것이 없지만,
          엘리먼트에 붙여야 소리가 난다. display:none 은 일부 브라우저에서 재생을
          멈추므로 화면 밖으로 밀어낸다.
        */}
        {call.staffStream ? (
          <OpenViduVideo
            streamManager={call.staffStream}
            className="pointer-events-none absolute size-px opacity-0"
          />
        ) : null}

        {/*
          역무원 발화 자막. 하단 컨트롤 버튼을 가리지 않도록 그 위에 띄운다.
          (footer 의 pb + 버튼 높이만큼 올림 — 버튼 크기가 바뀌면 같이 조정)
        */}
        <CaptionOverlay
          lines={caption.lines}
          partial={caption.partial}
          className="bottom-[calc(env(safe-area-inset-bottom,0px)+7.5rem)]"
        />

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
