/**
 * 얼굴 모자이크 — 타입.
 * 명세: Notion API 명세서 > AI > 얼굴 검출 (/ws/v1/ai/faces)
 *
 * 프론트가 다운스케일한 프레임(base64)을 보내면 AI 가 얼굴 bounding box
 * 좌표를 돌려주고, 모자이크 처리는 프론트가 canvas 로 한다.
 */

/** 검출된 얼굴 하나 (명세 Response 의 faces[] 원소) */
export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
  confidence?: number
}

/** 프레임 검출 요청 (명세 Request) */
export interface FaceFrameRequest {
  frameId: number
  timestamp: number
  /** data URL 프리픽스를 뗀 base64 (명세 예시가 프리픽스 없는 형식) */
  image: string
}

/** 검출 결과 (명세 Response). 좌표는 "보낸 이미지" 크기 기준이다 */
export interface FaceFrameResult {
  frameId: number
  faces: FaceBox[]
}

/**
 * 검출기 통로. 실제 구현(wsFaceDetector)과 개발용 목(mockFaceDetector)이
 * 이 모양을 공유한다 — 자막의 CaptionTransport 와 같은 패턴.
 */
export interface FaceDetector {
  start(
    onResult: (result: FaceFrameResult) => void,
    onError?: (error: Error) => void,
  ): void
  /**
   * 프레임 하나 검출 요청. 연결 전이면 조용히 버린다.
   * size 는 보낸 이미지의 크기 — 목이 그럴듯한 좌표를 만들 때만 쓰고
   * 실제 소켓 구현은 무시한다 (서버는 이미지에서 직접 읽는다).
   */
  detect(request: FaceFrameRequest, size: { width: number; height: number }): void
  stop(): void
}
