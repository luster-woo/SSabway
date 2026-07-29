import {
  CAMERA_ERROR,
  type CameraErrorType,
} from '@/user/features/sign-capture/hooks/useCameraStream'

/**
 * 오류 종류를 i18n 키로 옮긴다.
 *
 * sign-capture 의 CameraErrorNotice 와 같은 signCapture.error.* 키를 재사용한다.
 * 문구가 카메라만 언급하지만 원인과 해결 방법이 마이크와 동일하다.
 * TODO: 마이크까지 아우르는 문구가 필요하면 이 매핑만 바꾼다.
 */
const ERROR_KEY: Record<CameraErrorType, string> = {
  [CAMERA_ERROR.INSECURE_CONTEXT]: 'signCapture.error.insecure',
  [CAMERA_ERROR.PERMISSION_DENIED]: 'signCapture.error.denied',
  [CAMERA_ERROR.NOT_FOUND]: 'signCapture.error.notFound',
  [CAMERA_ERROR.IN_USE]: 'signCapture.error.inUse',
  [CAMERA_ERROR.UNKNOWN]: 'signCapture.error.unknown',
}

export function toCallMediaErrorKey(errorType: CameraErrorType): string {
  return ERROR_KEY[errorType]
}
