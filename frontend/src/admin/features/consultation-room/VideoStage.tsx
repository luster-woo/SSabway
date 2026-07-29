import { RecordingBadge } from '@/admin/features/consultation-room/RecordingBadge'

/**
 * 사용자 영상 영역.
 *
 * 사용자 브라우저가 얼굴을 가린 뒤 발행한 스트림 하나만 받는다.
 * 역무원은 영상을 발행하지 않으므로 자기 화면 미리보기가 없다.
 *
 * TODO: OpenVidu 연동 시 이 자리에 subscriber 비디오를 붙인다.
 *       모자이크 fail-safe 로 사용자가 비디오 발행을 중단하면(AUDIO_ONLY)
 *       오류가 아니라 "영상 보호 중"으로 표시해야 한다.
 */
export function VideoStage() {
  return (
    <section className="relative flex min-h-0 flex-1 overflow-hidden rounded-3xl bg-[#3B434C]">
      <div className="absolute top-5 left-5 z-10">
        <RecordingBadge />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p className="text-[13px] font-bold text-white/60">
          영상 연결은 준비 중입니다
        </p>
      </div>

      <p className="absolute bottom-5 left-5 rounded-full bg-black/45 px-4 py-2 text-[12.5px] text-white/85">
        사용자 후면 카메라 · 타인 얼굴 모자이크
      </p>
    </section>
  )
}
