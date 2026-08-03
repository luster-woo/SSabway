/**
 * 프로토타입이 서비스하는 단일 역.
 *
 * 상담 요청(`POST /api/v1/consultations`)은 `departureStationId` 를 요구하고,
 * 서버가 그 값으로 담당 역무원을 배정한다 (`staffs.station_id` 가 UNIQUE —
 * 역 1개당 역무원 1명). 그런데 프론트에는 출발역의 DB id 를 알 수단이 없다:
 *
 *   - `useOriginStationStore` 의 `NearestStation` 은 Google Places 결과라
 *     이름·좌표만 있고 우리 DB 의 station_id 가 없다.
 *   - 그 값을 줄 수 있는 `GET /api/v1/routes/gps` 는 BE 에 컨트롤러가 없고,
 *     명세상 응답도 역 "이름" 뿐이었다.
 *
 * 이 프로젝트는 대구역 단일 역 프로토타입이라(도면·안내 단계도 대구역 고정)
 * 그 전제를 여기 한 곳에 모아 둔다. 데이터셋이 늘어나기 전까지만 유효하다.
 *
 * ⚠️ 값 확정 필요 — `deploy/db/schema.sql` 에 시드 INSERT 가 없어서 대구역의
 *    실제 station_id 가 아직 존재하지 않는다. 시드가 들어오면 그 값으로 바꾼다.
 *    값이 실제와 다르면 서버가 `STAFF_NOT_FOUND` 를 돌려준다.
 *
 * TODO: 표지판 분석(`POST /routes/sign`)이 붙으면 응답에 stationId 가 실려 오므로
 *       이 상수를 지우고 그 값을 쓴다. (역 확장도 그때 함께 열린다)
 */
export const PROTOTYPE_STATION_ID = 1
