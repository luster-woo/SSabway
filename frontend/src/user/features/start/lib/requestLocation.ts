/** 명세의 latitude / longitude 와 이름을 맞춘다. */
export interface Coords {
  latitude: number
  longitude: number
}

/**
 * 위치를 못 잡고 기다리는 시간. 기본값은 무한이라 지하에서 영영 끝나지 않는다.
 * 사용자가 "멈췄나?" 하고 느끼기 전에 끊고 다시 시도하게 한다.
 */
const TIMEOUT_MS = 10_000

/**
 * 캐시된 좌표를 받아들일 최대 나이.
 *
 * 역 주변에서 1분 사이에 움직인 거리는 "가까운 역" 판정에 영향이 없고,
 * 방금 받은 좌표가 있다면 다시 잡느라 기다릴 이유가 없다.
 */
const MAX_AGE_MS = 60_000

/**
 * 브라우저에 위치 권한을 요청하고 좌표를 받는다.
 *
 * getCurrentPosition 은 콜백 API 라 호출부에서 그대로 쓰면 성공·실패 분기가
 * 흩어진다. Promise 로 감싸고, 실패는 예외가 아니라 null 로 돌려준다.
 * 화면에서는 "좌표를 받았는가" 두 갈래만 알면 되기 때문이다.
 *   - 사용자가 브라우저 권한 창에서 거부
 *   - 지하라 신호가 없음 / 시간 초과
 * 셋 다 다음에 할 일이 "표지판 촬영으로 진행하거나 다시 시도" 로 같다.
 */
export function requestLocation(): Promise<Coords | null> {
  // 보안 컨텍스트(https 또는 localhost)가 아니면 API 자체가 없다.
  if (!('geolocation' in navigator)) return Promise.resolve(null)

  return new Promise<Coords | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      {
        // 역 단위로 찾으므로 고정밀이 필요 없다. 켜면 배터리를 더 쓰고 더 느리다.
        enableHighAccuracy: false,
        timeout: TIMEOUT_MS,
        maximumAge: MAX_AGE_MS,
      },
    )
  })
}
