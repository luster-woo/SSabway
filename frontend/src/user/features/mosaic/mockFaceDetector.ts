import type {
  FaceDetector,
  FaceFrameResult,
} from '@/user/features/mosaic/types'

/**
 * AI 연동 전 개발용 가짜 검출기.
 *
 * 화면 가운데를 천천히 도는 얼굴 하나를 돌려준다 — 모자이크 블록이
 * 프레임을 따라 움직이는 것을 눈으로 확인하기 위해서다.
 * 선택은 useFaceMosaic 이 `IS_DEV && env.USE_MSW` 로 한다.
 */
export function createMockFaceDetector(): FaceDetector {
  let emit: ((result: FaceFrameResult) => void) | null = null
  let stopped = false

  return {
    start(onResult) {
      emit = onResult
      stopped = false
    },
    detect(request, size) {
      if (!emit || stopped) return
      // 실제 서버의 지연(수십 ms)을 흉내낸다
      setTimeout(() => {
        if (!emit || stopped) return
        const face = Math.min(size.width, size.height) * 0.3
        const angle = request.frameId / 8
        emit({
          frameId: request.frameId,
          faces: [
            {
              x: size.width / 2 + Math.cos(angle) * size.width * 0.2 - face / 2,
              y: size.height / 2 + Math.sin(angle) * size.height * 0.15 - face / 2,
              width: face,
              height: face,
              confidence: 0.95,
            },
          ],
        })
      }, 50)
    },
    stop() {
      stopped = true
      emit = null
    },
  }
}
