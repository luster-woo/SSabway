import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/** 확신도가 낮을 때 사용자에게 고르게 할 후보 하나. (BE SignPredictResponse.Candidate 와 1:1) */
export interface SignCandidate {
  signageId: string
  floor: string
  confidence: number
}

/**
 * 표지판 인식 응답의 data.
 * 명세: Notion API 명세서 > AI > 표지판 인식 (POST /api/v1/ai/signs/predict)
 *
 * signageId 는 지도 노드 id 와 같은 값이라(예: S3_02) 길안내의 출발 지점
 * (useStationNodeStore.setStartPoint)으로 그대로 넘긴다.
 *
 * confident 로 신뢰 여부를 가른다 — true 면 signageId 를 그대로 쓰고, false 면
 * 확신도가 낮다는 뜻이라 그대로 진행하지 않는다. BE 는 확신도가 낮아도
 * signageId 를 비우지 않고 가장 가까운 후보를 담아 보낸다(candidates 참고).
 *
 * ⚠️ BE 는 이 다섯 필드를 모두 내려준다. 예전에는 signageId/floor 만 받고
 *    나머지를 버려서 "확신도 낮음 → 확인" 흐름 자체를 만들 수 없었다.
 */
export interface SignPrediction {
  signageId?: string
  floor?: string
  /** 0~1. 최상위 후보의 확신도 */
  confidence?: number
  /** true 면 signageId 를 그대로 사용, false 면 candidates 로 확인이 필요하다 */
  confident?: boolean
  /** 확신도가 낮을 때 제시할 후보들. 신뢰할 만하면 비어 있을 수 있다 */
  candidates?: SignCandidate[]
}

/** 명세 예시 봉투. success/isSuccess 표기가 문서마다 갈려 둘 다 받는다 */
interface PredictEnvelope {
  isSuccess?: boolean
  success?: boolean
  message?: string
  data?: SignPrediction
}

/**
 * 촬영한 표지판 이미지를 AI 인식에 보낸다.
 *
 * multipart 로 보낸다 — FormData 를 주면 axios 가 boundary 포함한
 * Content-Type 을 알아서 붙이므로 헤더를 직접 지정하면 안 된다.
 *
 * 타임아웃은 userApi 기본(10초)보다 길게 잡는다. AI 컨테이너가 CPU 추론이라
 * (YOLO 검출 + ResNet 분류) 순간 부하에서는 10초를 넘길 수 있다.
 */
export async function predictSign(image: Blob): Promise<SignPrediction> {
  const form = new FormData()
  // 파일명 확장자는 서버 쪽 content-type 판별을 돕는다.
  // captureFrame / 파일 선택 모두 image/jpeg 로 온다.
  form.append('image', image, 'sign.jpg')

  const response = await userApi.post<PredictEnvelope>(
    endpoints.ai.signPredict,
    form,
    { timeout: 20_000 },
  )

  // HTTP 200 인데 봉투가 실패인 경우도 실패로 취급한다
  const body = response.data
  if (body.isSuccess === false || body.success === false) {
    throw new Error(body.message ?? '표지판 인식에 실패했습니다')
  }
  return body.data ?? {}
}
