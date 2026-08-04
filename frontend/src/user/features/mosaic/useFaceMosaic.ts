import { useEffect, useState } from 'react'

import { env, IS_DEV } from '@/shared/lib/env'
import { createMockFaceDetector } from '@/user/features/mosaic/mockFaceDetector'
import { createMosaicPipeline } from '@/user/features/mosaic/mosaicPipeline'
import type { FaceDetector } from '@/user/features/mosaic/types'
import { createWsFaceDetector } from '@/user/features/mosaic/wsFaceDetector'

/** 검출 요청 주기. AI 왕복 + 처리 시간을 고려해 초당 4장 */
const DETECT_INTERVAL_MS = 250
/** 검출용 프레임의 긴 변. 작을수록 전송·검출이 빠르다 */
const DETECT_MAX_SIDE = 320
/**
 * 이 시간 동안 검출 결과가 없으면 전체 블러로 전환한다.
 * 검출이 죽었는데 얼굴만 안 가려진 채 나가는 것이 최악의 실패라서,
 * "검출 불가 = 전부 가림" 을 기본 방향으로 둔다.
 */
const STALE_MS = 2_000
/**
 * 박스 여유 비율. 검출 좌표는 최대 수백 ms 전 프레임 기준이라
 * 머리가 움직인 만큼 어긋난다 — 사방으로 조금 크게 가려서 흡수한다.
 */
const BOX_MARGIN = 0.15

export interface FaceMosaicState {
  /**
   * 발행·미리보기용 처리된 스트림. 원본 대신 이것을 OpenVidu 에 넘긴다.
   * 원본이 없으면 null.
   */
  stream: MediaStream | null
  /**
   * idle      원본 없음
   * active    검출 결과 기반으로 얼굴만 가리는 중
   * fallback  검출 지연·중단 — 전체 블러로 방어 중 (첫 결과 전도 이 상태)
   * error     검출 소켓 재연결 포기 — 전체 블러 유지
   */
  status: 'idle' | 'active' | 'fallback' | 'error'
}

/**
 * 카메라 원본 → 얼굴 모자이크된 스트림.
 * 명세: Notion API 명세서 > AI > 얼굴 검출 (/ws/v1/ai/faces)
 *
 * 사용자 화면 전용이다 — 역무원은 영상을 발행하지 않아 모자이크가 필요 없다.
 * 원본 프레임을 다운스케일해 AI 로 보내고, 받은 박스를 원본 해상도로 환산해
 * 파이프라인에 넘긴다. 상세 흐름은 mosaicPipeline.ts 머리 주석 참고.
 */
export function useFaceMosaic(source: MediaStream | null): FaceMosaicState {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<FaceMosaicState['status']>('idle')

  useEffect(() => {
    if (!source) {
      setStream(null)
      setStatus('idle')
      return
    }

    const pipeline = createMosaicPipeline(source)
    setStream(pipeline.stream)
    setStatus('fallback') // 첫 검출 결과 전 — 전체 보호로 시작

    const detector: FaceDetector =
      IS_DEV && env.USE_MSW ? createMockFaceDetector() : createWsFaceDetector()

    let frameId = 0
    let lastResultAt = 0
    let pending = 0
    let failed = false
    /*
      frameId → 보낸 프레임 크기. 응답 좌표가 "보낸 이미지" 기준이라
      원본 해상도로 되돌릴 배율을 요청 시점에 붙잡아 둬야 한다.
      (프레임마다 크기가 같더라도, 회전 등으로 바뀌는 순간 섞이면 안 된다)
    */
    const sentSizes = new Map<number, { width: number; height: number }>()
    let lastAppliedId = 0

    detector.start(
      (result) => {
        pending = Math.max(0, pending - 1)
        const size = sentSizes.get(result.frameId)
        sentSizes.delete(result.frameId)
        // 순서가 뒤바뀐 늦은 응답은 버린다 — 옛 좌표로 되돌아가며 떨린다
        if (!size || result.frameId <= lastAppliedId) return
        lastAppliedId = result.frameId
        lastResultAt = Date.now()

        // 다운스케일 프레임 좌표 → 0~1 정규화 (+ 사방 여유).
        // 파이프라인이 그릴 때마다 현재 해상도로 환산하므로 여기서
        // 원본 픽셀을 알 필요가 없다.
        pipeline.setBoxes(
          result.faces.map((face) => {
            const mx = face.width * BOX_MARGIN
            const my = face.height * BOX_MARGIN
            return {
              x: (face.x - mx) / size.width,
              y: (face.y - my) / size.height,
              width: (face.width + mx * 2) / size.width,
              height: (face.height + my * 2) / size.height,
            }
          }),
        )
        pipeline.setProtectAll(false)
        setStatus('active')
      },
      () => {
        failed = true
        pipeline.setProtectAll(true)
        setStatus('error')
      },
    )

    const timer = window.setInterval(() => {
      // 검출이 오래 조용하면 전체 보호로 후퇴 (소켓 오류 확정 전에도)
      if (!failed && Date.now() - lastResultAt > STALE_MS) {
        pipeline.setProtectAll(true)
        setStatus((prev) => (prev === 'error' ? prev : 'fallback'))
      }
      if (failed || pending >= 2) return // 응답이 밀리면 쌓지 않는다

      const frame = pipeline.captureFrame(DETECT_MAX_SIDE)
      if (!frame) return
      frameId += 1
      sentSizes.set(frameId, { width: frame.width, height: frame.height })
      // 오래된 미응답 항목 정리 (유실 대비)
      for (const key of sentSizes.keys()) {
        if (key < frameId - 20) sentSizes.delete(key)
      }
      pending += 1
      detector.detect(
        { frameId, timestamp: Date.now(), image: frame.image },
        { width: frame.width, height: frame.height },
      )
    }, DETECT_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
      detector.stop()
      pipeline.stop()
      setStream(null)
      setStatus('idle')
    }
  }, [source])

  return { stream, status }
}
