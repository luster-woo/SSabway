package com.ssafy.ssabway.domain.route.entity;

import java.util.Map;

/*
    (역, 노선, 방향) → 승강장 진입 지점 코드(points.point_code) 매핑.
    프론트가 이 값을 실내 안내 API에 그대로 넘긴다.

    SubwayLane(노선 단위)에 두지 않은 이유: point_code는 역마다 다르다.
    같은 "1호선 상행"이라도 대구역과 동대구역의 승강장 코드가 다르므로
    역을 키에 포함해야 한다. 노선 단위로 두면 역이 늘어날 때
    엉뚱한 역의 코드가 조용히 붙는다.

    역 데이터가 늘면 CODES에 항목을 추가하면 된다. 빠뜨리면 null이 되어
    "안내 불가"로 드러나므로, 잘못된 승강장으로 안내하는 것보다 안전하게 실패한다.
 */
public final class StartPoint {

    private static final Map<Key, String> CODES = Map.of(
            new Key("대구역", SubwayLane.DAEGU_LINE_1, 1), "GA_04",    // 설화명곡 방면
            new Key("대구역", SubwayLane.DAEGU_LINE_1, 2), "GA_03",    // 하양 방면
            new Key("대구역", SubwayLane.DAEGYEONG_LINE, 1), "GA_02",  // 구미 방면
            new Key("대구역", SubwayLane.DAEGYEONG_LINE, 2), "GA_01"   // 경산 방면
    );

    private StartPoint() {}

    /*
        매핑이 없으면 null을 반환한다.
          - 대구역에 2·3호선이 지나지 않듯 모든 조합에 승강장이 있는 것은 아니다
          - 환승 이후 구간은 다른 역에서 출발하므로 매핑이 없다
          - UNKNOWN 노선, wayCode 누락도 여기로 온다
        프론트는 null이면 실내 안내를 시작하지 않는다.
     */
    public static String codeOf(String stationNameKor, SubwayLane lane, Integer wayCode) {
        if (stationNameKor == null || wayCode == null) return null;

        return CODES.get(new Key(stationNameKor, lane, wayCode));
    }

    private record Key(String station, SubwayLane lane, int wayCode) {}
}