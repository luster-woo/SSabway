/**
 * 경로 조회에 넣을 출발·도착 좌표의 폴백.
 *
 * ⚠️ 목 응답 파일이 아니다. `POST /routes/path` 는 실서버로 나가고
 *    (fetchRoutePaths), 여기 남은 것은 "아직 스토어에 값이 없을 때 쓸 좌표"뿐이다.
 *    예전의 MOCK_ROUTE_PATHS(서울 2·4호선 가짜 경로)는 삭제했다 —
 *    BE 응답과 형태가 달라 그대로 두면 연동 후 화면이 깨진다.
 *
 * TODO: 파일명을 originFallback.ts 정도로 바꿀 것. import 가 걸려 있어 미뤘다.
 */

/**
 * 출발지 폴백.
 *
 * ⚠️ BE `RouteService.SUPPORTED_START_STATIONS` 가 현재 **대구역 하나**다.
 *    실내 안내 데이터(points/edges)를 가진 역이 대구역뿐이라, 다른 역에서
 *    출발하는 경로는 서버가 응답에서 걸러내고 404 SUBWAY_ROUTE_NOT_FOUND 를 준다.
 *    그래서 폴백도 반드시 대구역이어야 한다. (한때 홍대입구 좌표가 박혀 있어
 *    실서버에 붙이면 100% 경로 없음이 나왔다)
 *
 * 정상 흐름에서는 시작 화면의 GPS 결과(useOriginStationStore)가 이 값을 덮는다.
 * 표지판 인식이 붙으면 그 결과가 우선한다.
 */
export const FALLBACK_ORIGIN = {
  name: '대구역',
  longitude: 128.596226,
  latitude: 35.87595,
} as const

/**
 * 목적지 폴백. 목적지를 고르지 않고 이 화면에 직접 들어온 경우에만 쓴다.
 * (useDestinationStore 에 값이 있으면 그쪽이 우선)
 */
export const FALLBACK_DESTINATION = {
  name: '수성알파시티역',
  longitude: 128.688,
  latitude: 35.83944,
} as const
