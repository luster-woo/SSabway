import type { FaceBox } from '@/user/features/mosaic/types'

/**
 * 카메라 원본 → 모자이크 처리된 MediaStream.
 *
 *   getUserMedia 원본
 *     → 숨은 <video> (화면에 붙이지 않음)
 *     → 매 프레임 canvas 에 그리며 얼굴 영역 픽셀화
 *     → canvas.captureStream() 비디오 트랙 + 원본 오디오 트랙
 *     → OpenVidu 로 발행 (useConsultationCall 의 localStream 자리)
 *
 * 좌표(setBoxes)는 0~1 정규화 값이다. 검출은 다운스케일 프레임으로 하고
 * 회전 등으로 원본 해상도가 도중에 바뀔 수 있어, 픽셀 좌표를 넘겨받으면
 * 그 순간의 해상도에 묶인다 — 비율로 받아 그릴 때마다 환산한다.
 *
 * ⚠️ captureFrame(검출용)은 모자이크 "전" 원본(video)에서 뜬다. 처리된
 *    canvas 에서 뜨면 이미 가린 얼굴이 다음 검출에서 사라져, 박스가 지워졌다
 *    다시 잡히기를 반복하며 깜빡인다.
 */

export interface MosaicPipeline {
  /** 발행·미리보기에 쓸 처리된 스트림 (video: canvas, audio: 원본) */
  stream: MediaStream
  /**
   * 검출용 프레임을 원본에서 떠서 base64(JPEG, 프리픽스 없음)로 돌려준다.
   * 비디오가 아직 준비 전이면 null.
   */
  captureFrame(maxSide: number): {
    image: string
    width: number
    height: number
  } | null
  /** 픽셀화할 영역들 (0~1 정규화 좌표 — useFaceMosaic 이 환산해 넘긴다) */
  setBoxes(boxes: FaceBox[]): void
  /** true 면 프레임 전체를 픽셀화 — 검출이 죽어 있는 동안의 안전장치 */
  setProtectAll(on: boolean): void
  stop(): void
}

/** 픽셀화 블록 크기. 값이 클수록 굵게 뭉개진다 */
const PIXEL_BLOCK = 14
/** canvas.captureStream 프레임레이트 */
const OUTPUT_FPS = 24

export function createMosaicPipeline(source: MediaStream): MosaicPipeline {
  /*
    숨은 재생용 video. DOM 에 붙이지 않아도 muted + playsInline 이면
    Chrome/Safari 모두 자동재생이 허용된다.
  */
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = source
  void video.play()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  // 픽셀화용 축소 버퍼와 검출 프레임용 버퍼
  const scratch = document.createElement('canvas')
  const scratchCtx = scratch.getContext('2d')
  const detect = document.createElement('canvas')
  const detectCtx = detect.getContext('2d')

  let boxes: FaceBox[] = []
  let protectAll = true // 첫 검출 결과가 오기 전까지는 전체 보호가 기본
  let rafId = 0

  function pixelate(sx: number, sy: number, sw: number, sh: number) {
    if (!ctx || !scratchCtx || sw < 2 || sh < 2) return
    scratch.width = Math.max(1, Math.floor(sw / PIXEL_BLOCK))
    scratch.height = Math.max(1, Math.floor(sh / PIXEL_BLOCK))
    scratchCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, scratch.width, scratch.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, sx, sy, sw, sh)
    ctx.imageSmoothingEnabled = true
  }

  function render() {
    rafId = requestAnimationFrame(render)
    if (!ctx || video.readyState < 2 || video.videoWidth === 0) return

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    /*
      카메라 토글(useCallMedia.toggleCamera)은 원본 트랙의 enabled 만 끈다.
      발행되는 것은 canvas 트랙이라 여기서 검게 칠하지 않으면 마지막
      프레임이 정지화면으로 계속 나간다 — 사용자는 껐다고 믿는데.
    */
    const sourceTrack = source.getVideoTracks()[0]
    if (!sourceTrack || !sourceTrack.enabled) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    if (protectAll) {
      pixelate(0, 0, canvas.width, canvas.height)
      return
    }

    for (const box of boxes) {
      // 정규화 좌표 → 현재 캔버스 픽셀. 캔버스 밖으로 나가는 부분은
      // 잘라낸다 — 음수/초과 좌표는 drawImage 를 깨뜨린다.
      const sx = Math.max(0, Math.floor(box.x * canvas.width))
      const sy = Math.max(0, Math.floor(box.y * canvas.height))
      const sw = Math.min(canvas.width - sx, Math.ceil(box.width * canvas.width))
      const sh = Math.min(canvas.height - sy, Math.ceil(box.height * canvas.height))
      pixelate(sx, sy, sw, sh)
    }
  }

  rafId = requestAnimationFrame(render)

  const processed = canvas.captureStream(OUTPUT_FPS)
  // 오디오는 가공할 것이 없으니 원본 트랙을 그대로 싣는다.
  // 마이크 토글(enabled)도 같은 트랙 객체라 그대로 동작한다.
  const stream = new MediaStream([
    ...processed.getVideoTracks(),
    ...source.getAudioTracks(),
  ])

  return {
    stream,
    captureFrame(maxSide) {
      if (!detectCtx || video.readyState < 2 || video.videoWidth === 0) {
        return null
      }
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
      const width = Math.round(video.videoWidth * scale)
      const height = Math.round(video.videoHeight * scale)
      detect.width = width
      detect.height = height
      detectCtx.drawImage(video, 0, 0, width, height)
      // 명세 예시가 프리픽스 없는 base64 라 data URL 머리를 뗀다.
      // PNG 는 사진에서 너무 커서 JPEG 을 쓴다 — AI 쪽 확인 항목.
      const image = detect.toDataURL('image/jpeg', 0.6).split(',')[1]
      return { image, width, height }
    },
    setBoxes(next) {
      boxes = next
    },
    setProtectAll(on) {
      protectAll = on
    },
    stop() {
      cancelAnimationFrame(rafId)
      // canvas 트랙만 멈춘다. 오디오는 원본(useCallMedia) 소유라 건드리지 않는다.
      processed.getVideoTracks().forEach((track) => {
        track.stop()
      })
      video.srcObject = null
    },
  }
}
