import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CaptionOverlay } from '@/shared/caption/CaptionOverlay'
import { useCaptionTranscript } from '@/shared/caption/useCaptionTranscript'
import { useLiveCaption } from '@/shared/caption/useLiveCaption'
import { useLanguage } from '@/shared/lib/useLanguage'
import { CONSULTATION_STATUS } from '@/shared/types'
import { Button, Dialog, useToast } from '@/shared/ui'
import { OpenViduVideo } from '@/shared/webrtc/OpenViduVideo'
import { OV_STATUS } from '@/shared/webrtc/useOpenViduSession'
import { useRemoteMediaStream } from '@/shared/webrtc/useRemoteMediaStream'
import { usePublishViewportAspect } from '@/shared/webrtc/useViewportAspect'
import { CallControls } from '@/user/features/consultation/CallControls'
import { CameraStage } from '@/user/features/consultation/CameraStage'
import { ConnectedBadge } from '@/user/features/consultation/ConnectedBadge'
import { toCallMediaErrorKey } from '@/user/features/consultation/callMediaErrorKey'
import { openviduApi } from '@/user/features/consultation/openviduApi'
import {
  CALL_MEDIA_STATUS,
  useCallMedia,
} from '@/user/features/consultation/useCallMedia'
import { useConsultationCall } from '@/user/features/consultation/useConsultationCall'
import { useFaceMosaic } from '@/user/features/mosaic/useFaceMosaic'

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
 * 얼굴 모자이크(선택지 A)는 useFaceMosaic 이 canvas 로 처리한다 — 원본이
 * 아니라 가공된 스트림을 발행하므로, 원본은 이 기기 밖으로 나가지 않는다.
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

  /*
    얼굴 모자이크. 원본(stream)은 검출·가공에만 쓰고, 발행과 미리보기는
    가공된 스트림(mosaic.stream)을 쓴다. 검출이 죽으면 전체 블러로 방어한다.
  */
  const mosaic = useFaceMosaic(stream)

  const call = useConsultationCall(consultationId, mosaic.stream)

  /*
    역무원 화면의 화각을 이 화면과 맞춘다.

    이 화면은 MobileViewport 를 쓰지 않는다 — 카메라가 화면을 꽉 채워야 해서
    폰 규격 컬럼(max-w-[430px]) 없이 뷰포트를 그대로 쓴다. 그래서 크롭 기준
    박스는 기기 화면 그 자체이고, 주소창이 오르내릴 때마다 세로가 변한다.
    역무원 쪽이 그 값을 상수로 들고 있으면 기기마다 양옆이 어긋나므로,
    실제로 잰 값을 통화 내내 보내 준다. (자세한 이유는 훅 주석 참고)
  */
  const cameraBoxRef = useRef<HTMLDivElement>(null)
  usePublishViewportAspect(call.session, cameraBoxRef)

  /*
    역무원 발화 자막. 역무원 음성(staffStream)을 사용자가 고른 언어로 번역해
    보여준다. 역무원은 한국어로 말한다는 전제라 sourceLang 은 'ko' 고정이다.
    (명세 /ws/v1/ai/translation 이 auto-detect 가 아니라 화자 언어를 요구한다)
  */
  const { language } = useLanguage()
  const staffAudioStream = useRemoteMediaStream(call.staffStream)

  /**
   * 역무원 음성이 실제로 들어오고 있는지. 배지와 대기 문구가 이걸로 갈리고,
   * 사용자 발화 인식도 이때부터 시작한다 — 마이크는 권한을 얻는 순간부터
   * 있지만 역무원이 수락하기 전까지는 인식할 이유가 없다(Azure 는 처리한
   * 오디오 시간으로 과금한다).
   */
  const isStaffConnected =
    call.status === OV_STATUS.CONNECTED && call.staffStream !== null

  /*
    상담 요약용 전문. 확정된 문장을 대화 순서대로 모아 두었다가 종료할 때
    한 번 보낸다. 화면에는 쓰지 않는다.
  */
  const transcript = useCaptionTranscript()

  const caption = useLiveCaption(
    staffAudioStream,
    { speaker: 'ADMIN', sourceLang: 'ko', targetLang: language },
    true,
    transcript.addStaffLine,
  )

  /*
    사용자 발화도 인식한다 — 화면에 띄우지 않고 전문에만 넣는다.

    자기가 한 말은 자기 화면에 자막으로 뜨지 않으므로(상대 음성만 듣는 구조)
    이게 없으면 전문이 역무원 발화만 남은 반쪽이 된다. 역무원 브라우저가
    가진 나머지 반쪽을 시그널로 넘겨받는 방법도 있지만, 그러면 상대 브라우저가
    살아 있어야 하고 배선도 늘어난다. 인식기 하나를 더 쓰는 편이 단순하다.

    한국어로 번역해 받는다 — 요약은 역무원이 대시보드에서 읽는다.
    (사용자 언어가 한국어면 번역 없이 그대로 온다)
  */
  useLiveCaption(
    stream,
    { speaker: 'USER', sourceLang: language, targetLang: 'ko' },
    isStaffConnected,
    transcript.addUserLine,
  )

  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)

  const isStreaming = status === CALL_MEDIA_STATUS.STREAMING
  const isRequesting = status === CALL_MEDIA_STATUS.REQUESTING

  const hasConsultationId = consultationId > 0

  /**
   * 서버가 이미 끝낸 상담이면 어느 상태로 끝났는지. 아니면 null.
   *
   * 종료된 상담으로 재진입하는 경로가 실제로 있다 — 이 화면은 URL 에
   * consultationId 를 들고 있어(새로고침 대비) 통화가 끝난 뒤 뒤로가기·
   * 새로고침으로 같은 URL 에 다시 들어올 수 있다. 그때 화면을 그대로 두면
   * 서버가 ENDED 를 주는데도 "역무원을 기다리는 중"이 계속 뜬다.
   */
  const closedStatus =
    call.consultationStatus === CONSULTATION_STATUS.ENDED ||
    call.consultationStatus === CONSULTATION_STATUS.CANCELED
      ? call.consultationStatus
      : null

  /** 통화 화면 상단에 띄울 안내. 없으면 null */
  const callNotice = (() => {
    if (!hasConsultationId) return t('consultation.video.noConsultationId')
    /*
      종료 안내가 실패 안내보다 먼저다. 끝난 상담은 isJoinFailed 로도 잡히는데
      (useConsultationMatch 의 isFailed 가 종료를 포함한다) 정상 종료를
      "연결하지 못했어요"로 보여주면 사용자가 재시도할 것을 찾게 된다.
      아래 이펙트가 곧 화면을 닫지만, 그 한 프레임에 틀린 문구를 보이지 않는다.
    */
    if (closedStatus !== null) {
      return closedStatus === CONSULTATION_STATUS.CANCELED
        ? t('consultation.video.canceled')
        : t('consultation.video.alreadyEnded')
    }
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

  const isNoticeAlert =
    (call.isJoinFailed && closedStatus === null) || !hasConsultationId

  /**
   * 통화를 시작하지 못한 채 이 화면을 떠난다. (권한 거부 · 미디어 오류)
   *
   * `call.leave()` 가 빠지면 상담이 MATCHED 로 남는다. 이 화면은 역무원이 이미
   * 수락한 뒤에만 진입하므로(`HelpChatPage` 의 `waiting.isMatched` 게이팅)
   * 여기서 나가는 사용자는 예외 없이 활성 상담을 하나 들고 있다. ssabway 의
   * `ACTIVE_STATUSES` 가 WAITING·MATCHED·IN_PROGRESS 를 모두 막고 MATCHED 를
   * 시간으로 정리하는 스케줄러도 없어서, 정리하지 않으면 다음 도움 요청이
   * 409 CONSULTATION_DUPLICATED 로 **영구히** 막힌다 — 역무원이 수동으로
   * 종료해 줄 때까지. 게다가 그 409 는 화면에서 블랙리스트 거절과 구분되지
   * 않아(`useConsultationRequest` 의 `isRejected`) 원인을 알 방법도 없다.
   *
   * leave 는 상태를 보고 취소/종료를 알아서 가르고 멱등이라, 여기서 상담이
   * WAITING 인지 MATCHED 인지 몰라도 그냥 부르면 된다.
   */
  const leaveWithoutCall = () => {
    void call.leave()
    stop()
    void navigate('/', { replace: true })
  }

  /** 요약을 이미 보냈는지. 종료 경로가 둘이라 중복을 막는다 */
  const summarySentRef = useRef(false)

  /**
   * 사용자가 직접 끊었는지.
   *
   * 그 경우 endCall 이 leave 완료를 기다렸다가 요약을 보내므로, 아래 종료
   * 감지 이펙트는 손대지 않아야 한다. 이펙트가 먼저 깨어나(leave 가 소켓을
   * 끊는 순간) 아직 ENDED 전에 보내면 서버가 거절한다.
   */
  const userEndedRef = useRef(false)

  /**
   * 모아 둔 자막을 보내 상담 요약을 만든다. 최선형이다.
   *
   * ⚠️ 상담이 ENDED 인 뒤에 불러야 한다. 서버가 종료된 상담만 요약해 준다.
   *    그래서 호출부가 종료를 먼저 끝내고(또는 이미 끝난 것을 확인하고) 부른다.
   *
   * 응답을 기다리지 않는다 — 화면은 이미 닫히는 중이고, 요약은 역무원이
   * 나중에 대시보드에서 보는 값이라 몇 초 늦어도 된다. 실패하면 그 상담만
   * "요약 없음"으로 남는다.
   *
   * 화면이 사라진 뒤에도 요청은 계속된다(라우터 이동일 뿐 페이지 언로드가
   * 아니다). 다만 브라우저를 강제 종료하면 요약은 만들어지지 않는다.
   */
  const submitSummary = () => {
    if (consultationId <= 0) return

    /*
      한 번만 보낸다.

      사용자가 [종료] 를 누르면 call.leave() 가 소켓을 끊어 상태가
      DISCONNECTED 가 되고, 그러면 아래 "역무원이 종료함" 이펙트도 함께
      깨어난다. 막지 않으면 종료 한 번에 요약 요청이 두 번 나가고, 그중
      먼저 나간 쪽은 아직 ENDED 전이라 서버가 거절한다.
    */
    if (summarySentRef.current) return
    summarySentRef.current = true

    const transcripts = transcript.snapshot()
    if (transcripts.length === 0) return

    void openviduApi
      .summarizeConsultation(consultationId, transcripts)
      .catch(() => {
        // 요약 실패가 통화 종료를 막지 않는다. 사용자가 할 수 있는 일도 없다.
      })
  }

  /*
    아래 종료 감지 이펙트가 부른다. 함수를 의존성에 넣으면 렌더마다 새로
    만들어져 이펙트가 계속 다시 돌고, 그때마다 요약을 또 보내게 된다.
  */
  const submitSummaryRef = useRef(submitSummary)
  submitSummaryRef.current = submitSummary

  const denyPermission = () => {
    showToast(t('consultation.video.permission.denied'))
    leaveWithoutCall()
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

    /*
      역무원이 종료한 경로다. 서버가 이미 ENDED 로 바꾼 뒤 세션을 닫으므로
      여기서는 기다릴 것 없이 바로 요약을 보낸다.
      사용자가 끊은 경우는 endCall 이 순서를 맞춰 보내므로 건드리지 않는다.
    */
    if (!userEndedRef.current) submitSummaryRef.current()

    stop()
    showToast(t('consultation.video.endedByStaff'))
    void navigate('/guide', { replace: true })
  }, [call.status, navigate, showToast, stop, t])

  /**
   * 서버가 이미 끝낸 상담이면 화면을 닫는다.
   *
   * 위의 DISCONNECTED 이펙트와 노리는 구간이 다르다. 그쪽은 **연결된 뒤** 세션이
   * 끊긴 경우고, 이쪽은 **연결되기 전**부터 이미 끝나 있던 경우다 — 종료 후
   * 같은 URL 로 재진입하거나, 대기 중 다른 탭에서 취소된 경우. OpenVidu 세션이
   * 애초에 없으니 sessionDisconnected 가 올 곳이 없어 그쪽 이펙트로는 못 잡는다.
   *
   * leave 는 부르지 않는다 — 서버가 이미 끝낸 상담이라 정리할 것이 없다.
   * 여기서 leave 를 부르면 끝난 상담에 매번 멱등 요청이 한 번씩 더 나간다.
   */
  useEffect(() => {
    if (closedStatus === null) return

    stop()
    showToast(
      closedStatus === CONSULTATION_STATUS.CANCELED
        ? t('consultation.video.canceled')
        : t('consultation.video.alreadyEnded'),
    )
    void navigate('/guide', { replace: true })
  }, [closedStatus, navigate, showToast, stop, t])

  const endCall = () => {
    /*
      연결을 먼저 끊고 장치를 반납한다. 순서가 반대면 이미 끝난 트랙을 발행하다
      OpenVidu 가 예외를 던진다.

      call.leave() 가 연결 해제와 함께 상담 종료 처리까지 맡는다 — 사용자
      전용 leave API 가 상태를 보고 취소/종료를 알아서 가른다 (8/4 BE 구현).
      이게 없으면 상담이 활성 상태로 남아 다음 도움 요청이 409 로 막힌다.
      자세한 분기는 useConsultationCall 의 leaveCall 주석 참고.
    */
    userEndedRef.current = true
    // 종료(ENDED)가 끝난 다음에 요약을 보낸다. 순서가 반대면 서버가 거절한다.
    void call.leave().then(submitSummary)
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
      {/*
        미리보기는 원본이다 — 모자이크는 관리자에게 전송되는 화면에만
        적용한다(팀 결정 8/4). 발행은 여전히 mosaic.stream 이므로 원본
        영상은 기기 밖으로 나가지 않는다. 상단의 "얼굴 모자이크 적용 중"
        배지가 그 사실을 사용자에게 알린다.
      */}
      <CameraStage
        stream={stream}
        isCameraOn={isCameraOn}
        boxRef={cameraBoxRef}
      />

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
        <Dialog
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
        </Dialog>
      ) : null}

      {status === CALL_MEDIA_STATUS.ERROR && errorType ? (
        <Dialog
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
            onClick={leaveWithoutCall}
          >
            {t('common.goHome')}
          </Button>
        </Dialog>
      ) : null}

      {isEndDialogOpen ? (
        <Dialog
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
        </Dialog>
      ) : null}
    </div>
  )
}
