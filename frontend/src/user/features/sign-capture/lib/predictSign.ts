import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 표지판 인식 응답의 data.
 * 명세: Notion API 명세서 > AI > 표지판 인식 (POST /api/v1/ai/signs/predict)
 *
 * ⚠️ 지금 화면 흐름에서는 이 값을 쓰지 않는다 — 경로 상세 화면이 전체 지도와
 *    경로 데이터를 처음부터 끝까지 제공하므로, 여기서는 "요청이 성공했는지"만
 *    확인하고 다음 화면으로 넘어간다. 위치 기반 분기가 생기면 그때 이 값을
 *    스토어에 담는 코드를 붙인다.
 */
export interface SignPrediction {
  signageId?: string
  floor?: string
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
