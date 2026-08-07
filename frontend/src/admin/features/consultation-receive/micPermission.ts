/** 마이크 확인 결과 — 수락 흐름이 분기해야 하는 경우만 구분한다. */
export const MIC_CHECK = {
  OK: 'OK',
  /** 권한 팝업에서 거부했거나, 브라우저에 "차단"이 저장돼 있다 */
  DENIED: 'DENIED',
  /** 장치가 없거나 다른 앱이 점유 중이거나 보안 컨텍스트가 아니다 */
  UNAVAILABLE: 'UNAVAILABLE',
} as const

export type MicCheck = (typeof MIC_CHECK)[keyof typeof MIC_CHECK]

/**
 * 마이크를 열 수 있는지 확인하고 즉시 반납한다.
 *
 * 상담을 수락하기 **전에** 부른다. 역무원이 마이크 권한을 거부한 채로 수락하면
 * 상담방에서 OpenVidu 의 initPublisherAsync 가 실패하는데, 그 상담을 다른
 * 역무원이 대신 받을 수도 없다 — 역마다 역무원 계정이 하나뿐이라 상담 생성
 * 시점에 담당자가 이미 정해진다(BE `Consultation.createWaiting`, staff_id 는
 * WAITING 부터 NOT NULL). 그래서 수락 자체를 막는다.
 *
 * ⚠️ 실패해도 상담은 건드리지 않는다. WAITING 그대로 두어 사용자의 순번을
 *    지키고, 역무원이 권한을 고치면 이어서 수락하게 한다. 이유는
 *    useAcceptConsultation 주석 참고.
 *
 * 이 검사는 장치를 실제로 여는 최종 관문이다. 화면에 머무는 동안의 상시
 * 감시는 팝업이 뜨지 않는 useMicPermission 이 맡는다 — 이쪽은 아직 권한을
 * 물어본 적이 없는 경우(prompt)에 팝업을 띄우는 역할까지 겸한다.
 *
 * 얻은 트랙은 바로 반납한다 — 권한 승인은 origin 에 남으므로 상담방의
 * initPublisherAsync 가 장치를 다시 열 때 권한을 또 묻지 않는다.
 * (사용자 앱은 스트림을 그대로 발행에 넘기지만, 여기는 수락과 상담방이
 *  다른 화면이라 스토어를 한 겹 더 태우는 값이 이득보다 크다)
 */
export async function checkMicPermission(): Promise<MicCheck> {
  if (!navigator.mediaDevices?.getUserMedia) return MIC_CHECK.UNAVAILABLE

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => {
      track.stop()
    })
    return MIC_CHECK.OK
  } catch (error) {
    /*
      거부와 장치 문제를 가른다 — 역무원이 취해야 할 조치가 다르다.
      거부는 브라우저 권한을 다시 허용해야 하고, 장치 문제는 마이크를
      연결하거나 점유 중인 앱을 닫아야 한다.
    */
    const isDenied =
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'SecurityError')

    return isDenied ? MIC_CHECK.DENIED : MIC_CHECK.UNAVAILABLE
  }
}
