import { useMemo } from 'react'
import type { StreamManager } from 'openvidu-browser'

import { CaptionOverlay } from '@/shared/caption/CaptionOverlay'
import { useLiveCaption } from '@/shared/caption/useLiveCaption'
import type { Language } from '@/shared/types/user'
import { OpenViduVideo } from '@/shared/webrtc/OpenViduVideo'
import { OV_STATUS, type OpenViduStatus } from '@/shared/webrtc/useOpenViduSession'
import type { LangCode } from '@/admin/lib/language'
import { RecordingBadge } from '@/admin/features/consultation-room/RecordingBadge'

interface VideoStageProps {
  userStream: StreamManager | null
  status: OpenViduStatus
  isRestoring: boolean
  isRestoreFailed: boolean
  isRecording: boolean
  /**
   * 사용자의 언어 (상담 정보의 langCode). 자막의 sourceLanguage 가 된다 —
   * AI 명세가 auto-detect 가 아니라 화자 언어를 요구한다.
   * 상담 정보 로딩 전(null)에는 자막을 켜지 않는다.
   */
  userLang: LangCode | null
}

/**
 * 사용자 영상 영역.
 *
 * 사용자 브라우저가 발행한 스트림 하나만 받는다.
 * 역무원은 영상을 발행하지 않으므로 자기 화면 미리보기가 없다.
 *
 * 사용자 발화는 실시간 번역 자막(useLiveCaption)으로 한국어 자막이 뜬다.
 * 역무원 화면은 한국어 고정이라 targetLang 도 'ko' 고정이다.
 *
 * TODO: 모자이크 fail-safe 로 사용자가 비디오 발행을 중단하면(AUDIO_ONLY)
 *       오류가 아니라 "영상 보호 중"으로 표시해야 한다.
 */
function toPlaceholder(
  status: OpenViduStatus,
  isRestoring: boolean,
  isRestoreFailed: boolean,
): string {
  if (isRestoreFailed) return '상담 세션에 연결하지 못했습니다'
  if (isRestoring) return '세션을 복구하는 중입니다…'

  switch (status) {
    case OV_STATUS.IDLE:
    case OV_STATUS.CONNECTING:
      return '연결하는 중입니다…'
    case OV_STATUS.RECONNECTING:
      return '네트워크가 불안정합니다. 다시 연결하는 중입니다…'
    case OV_STATUS.DISCONNECTED:
      return '통화가 종료되었습니다'
    case OV_STATUS.FAILED:
      return '연결에 실패했습니다'
    default:
      return '사용자가 접속하기를 기다리는 중입니다…'
  }
}

export function VideoStage({
  userStream,
  status,
  isRestoring,
  isRestoreFailed,
  isRecording,
  userLang,
}: VideoStageProps) {
  /*
    자막용 원격 오디오. StreamManager 에서 MediaStream 을 꺼낸다.
    getMediaStream() 은 같은 스트림에 대해 같은 객체를 돌려주지만,
    렌더마다 호출해 훅의 deps 를 흔들 이유가 없어 memo 로 고정한다.
  */
  const userAudioStream = useMemo(
    () => (userStream ? userStream.stream.getMediaStream() : null),
    [userStream],
  )

  const caption = useLiveCaption(
    userAudioStream,
    {
      speaker: 'USER',
      // 관리자 API 의 LangCode('EN')를 앱 Language('en')로. 언어를 아직 못
      // 받았으면 아래 enabled 가 막고 있으므로 이 fallback 값은 쓰이지 않는다.
      sourceLang: (userLang?.toLowerCase() ?? 'en') as Language,
      targetLang: 'ko',
    },
    userLang !== null,
  )

  return (
    <section className="relative flex min-h-0 flex-1 overflow-hidden rounded-3xl bg-[#3B434C]">
      {isRecording ? (
        <div className="absolute top-5 left-5 z-10">
          <RecordingBadge />
        </div>
      ) : null}

      {userStream ? (
        <OpenViduVideo
          streamManager={userStream}
          muted={false}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-8">
          <p
            role={isRestoreFailed ? 'alert' : undefined}
            className="text-center text-[13px] font-bold text-white/60"
          >
            {toPlaceholder(status, isRestoring, isRestoreFailed)}
          </p>
        </div>
      )}

      {/* 사용자 발화 → 한국어 자막. 하단 라벨과 겹치지 않게 한 단 위에 둔다 */}
      <CaptionOverlay
        lines={caption.lines}
        partial={caption.partial}
        className="bottom-16"
      />

      <p className="absolute bottom-5 left-5 rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
        사용자 후면 카메라
      </p>
    </section>
  )
}
