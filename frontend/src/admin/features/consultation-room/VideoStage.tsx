import type { StreamManager } from 'openvidu-browser'

import { OpenViduVideo } from '@/shared/webrtc/OpenViduVideo'
import { OV_STATUS, type OpenViduStatus } from '@/shared/webrtc/useOpenViduSession'
import { RecordingBadge } from '@/admin/features/consultation-room/RecordingBadge'

interface VideoStageProps {
  userStream: StreamManager | null
  status: OpenViduStatus
  isRestoring: boolean
  isRestoreFailed: boolean
  isRecording: boolean
}

/**
 * 사용자 영상 영역.
 *
 * 사용자 브라우저가 발행한 스트림 하나만 받는다.
 * 역무원은 영상을 발행하지 않으므로 자기 화면 미리보기가 없다.
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
}: VideoStageProps) {
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

      <p className="absolute bottom-5 left-5 rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
        사용자 후면 카메라
      </p>
    </section>
  )
}
