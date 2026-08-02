/** 명세의 latitude / longitude 와 이름을 맞춘다. */
export interface Coords {
  latitude: number
  longitude: number
}

/**
 * 위치를 못 잡고 기다리는 시간. 기본값은 무한이라 지하에서 영영 끝나지 않는다.
 * 사용자가 "멈췄나?" 하고 느끼기 전에 끊고 다시 시도하게 한다.
 */
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * 캐시된 좌표를 받아들일 최대 나이(기본값).
 *
 * 지도 "내 위치" 마커처럼 대략 위치만 필요할 땐, 방금 받은 좌표가 있으면
 * 다시 잡느라 기다릴 이유가 없다. 정확한 역 판정이 필요한 곳에서는 maxAgeMs: 0 으로
 * 새 좌표를 강제한다.
 */
const DEFAULT_MAX_AGE_MS = 60_000

export interface RequestLocationOptions {
  /**
   * GPS 칩(고정밀)을 쓸지 여부.
   * 켜면 오차가 수 m 수준으로 정확해지지만, fix 가 느리고 배터리를 더 쓴다.
   * 최근접 역을 정확히 고르려면 켠다. 지도 중심 맞추기 정도면 꺼도 된다.
   */
  highAccuracy?: boolean
  /** 좌표를 못 잡고 기다리는 최대 시간(ms). */
  timeoutMs?: number
  /** 이 나이(ms) 이하의 캐시 좌표는 새로 잡지 않고 재사용한다. 0이면 항상 새로 잡는다. */
  maxAgeMs?: number
}

/**
 * 브라우저에 위치 권한을 요청하고 좌표를 받는다.
 *
 * getCurrentPosition 은 콜백 API 라 호출부에서 그대로 쓰면 성공·실패 분기가
 * 흩어진다. Promise 로 감싸고, 실패는 예외가 아니라 null 로 돌려준다.
 * 화면에서는 "좌표를 받았는가" 두 갈래만 알면 되기 때문이다.
 *   - 사용자가 브라우저 권한 창에서 거부
 *   - 지하라 신호가 없음 / 시간 초과
 * 셋 다 다음에 할 일이 "표지판 촬영으로 진행하거나 다시 시도" 로 같다.
 *
 * 옵션 기본값은 "빠르고 대략적인" 쪽이다. 정확도가 중요한 호출부는
 * { highAccuracy: true, maxAgeMs: 0 } 를 넘겨 정밀한 새 좌표를 받는다.
 */
export function requestLocation({
  highAccuracy = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}: RequestLocationOptions = {}): Promise<Coords | null> {
  // 보안 컨텍스트(https 또는 localhost)가 아니면 API 자체가 없다.
  if (!('geolocation' in navigator)) return Promise.resolve(null)

  return new Promise<Coords | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maxAgeMs,
      },
    )
  })
}
