import type { StreamManager } from 'openvidu-browser'

import { CaptionOverlay } from '@/shared/caption/CaptionOverlay'
import { useLiveCaption } from '@/shared/caption/useLiveCaption'
import type { Language } from '@/shared/types/user'
import { OpenViduVideo } from '@/shared/webrtc/OpenViduVideo'
import {
  OV_STATUS,
  type OpenViduStatus,
} from '@/shared/webrtc/useOpenViduSession'
import { useRemoteMediaStream } from '@/shared/webrtc/useRemoteMediaStream'
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
  /**
   * 사용자 화면의 가로 ÷ 세로. 사용자 브라우저가 재서 시그널로 보내 준 값이다.
   * 아직 못 받았으면 null — 아래 기본값으로 떨어진다.
   */
  userScreenAspect: number | null
}

/**
 * 사용자 화면 비율을 아직 못 받았을 때 쓸 기본값.
 *
 * ⚠️ 이 값이 맞는 기기는 사실상 없다. 실제 값이 도착하기 전 몇 프레임과,
 *    시그널이 실패한 경우를 덮는 임시값일 뿐이다. 통화 중에는 사용자
 *    브라우저가 잰 실제 비율(userScreenAspect)이 이 값을 대체한다.
 *
 *    상수로 둘 수 없는 이유: 기기마다 화면 비율이 다르고(0.46~0.56 대가 흔하다),
 *    모바일 주소창이 오르내릴 때마다 100dvh 가 변하며, 가로로 눕히면 뒤집힌다.
 *    고정값을 쓰던 동안 역무원 화면은 사용자보다 양옆이 더 잘려 보였다.
 *
 * 430 × 932 — 흔한 폰 한 대의 CSS 픽셀 크기.
 */
const FALLBACK_USER_SCREEN_ASPECT = 430 / 932

/** 영상이 아직 없을 때 그 자리에 띄울 안내 문구. */
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

/**
 * 사용자 영상 영역.
 *
 * 사용자 브라우저가 발행한 스트림 하나만 받는다.
 * 역무원은 영상을 발행하지 않으므로 자기 화면 미리보기가 없다.
 *
 * 영상 크기: 감싸는 박스(이 section)의 **세로를 가득** 채우고 가로는 사용자
 * 화면 비율로 정해진다. 양옆에 남는 공간은 배경으로 둔다.
 * `<video>` 를 영역에 그대로 늘리면(w-full h-full) 노트북에서는 가로가 넓은
 * 만큼 영상만 지나치게 커지고, 사용자 폰과 화각도 달라진다.
 * 연결 전 안내 문구는 지금처럼 영역 전체를 쓴다 — 잘릴 영상이 없다.
 *
 * 사용자가 기기를 눕히면 비율이 1을 넘어 가로가 먼저 max-w-full 에 걸리고
 * 세로가 남는다. "세로를 가득" 규칙과 어긋나 보이지만 그게 맞다 — 이 화면의
 * 목적은 틀을 채우는 것이 아니라 사용자와 같은 화각을 보여주는 것이다.
 *
 * 사용자 발화는 실시간 번역 자막(useLiveCaption)으로 한국어 자막이 뜬다.
 * 역무원 화면은 한국어 고정이라 targetLang 도 'ko' 고정이다.
 *
 * TODO: 모자이크 fail-safe 로 사용자가 비디오 발행을 중단하면(AUDIO_ONLY)
 *       오류가 아니라 "영상 보호 중"으로 표시해야 한다.
 */
export function VideoStage({
  userStream,
  status,
  isRestoring,
  isRestoreFailed,
  isRecording,
  userLang,
  userScreenAspect,
}: VideoStageProps) {
  /*
    자막용 원격 오디오.

    memo 로 고정하면 안 된다 — subscribe 직후에는 MediaStream 이 아직 없어
    undefined 가 나오는데, Subscriber 참조는 그대로라 다시 계산되지 않는다.
    자세한 내용은 useRemoteMediaStream 주석 참고.
  */
  const userAudioStream = useRemoteMediaStream(userStream)

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
    <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl bg-[#3B434C]">
      {isRecording ? (
        <div className="absolute top-5 left-5 z-10">
          <RecordingBadge />
        </div>
      ) : null}

      {userStream ? (
        /*
          세로를 가득 채우는 폰 비율 틀. 창이 아주 좁아 비율로 계산한 가로가
          영역을 넘칠 때만 max-w-full 이 걸려 그만큼 더 잘린다.
        */
        <div
          className="relative h-full max-w-full overflow-hidden"
          style={{
            aspectRatio: userScreenAspect ?? FALLBACK_USER_SCREEN_ASPECT,
          }}
        >
          <OpenViduVideo
            streamManager={userStream}
            muted={false}
            /*
              contain 이 아니라 cover 다. 사용자 폰도 같은 비율의 컬럼에
              object-cover 로 영상을 담으므로(CameraStage), 잘려 나가는 범위까지
              사용자가 보는 화면과 같아진다.
            */
            className="size-full object-cover"
          />

          {/* 영상을 가리키는 라벨이라 틀 안에 둔다 — 배경 위에 떠 있으면 뭘 가리키는지 알 수 없다 */}
          <p className="absolute bottom-5 left-5 rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
            사용자 후면 카메라
          </p>
        </div>
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

      {/*
        사용자 발화 → 한국어 자막. 하단 라벨과 겹치지 않게 한 단 위에 둔다.

        영상 틀이 아니라 section 기준이다 — 자막은 23px 라 폰 비율 틀(노트북에서
        약 350px) 안에 넣으면 줄바꿈이 심해진다. 틀이 가운데 정렬이라 자막도
        영상 위에 오고, 긴 문장만 양옆 배경으로 조금 넘친다.
      */}
      <CaptionOverlay
        lines={caption.lines}
        partial={caption.partial}
        className="bottom-16"
      />
    </section>
  )
}
