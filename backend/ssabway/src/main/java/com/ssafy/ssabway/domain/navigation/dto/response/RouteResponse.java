package com.ssafy.ssabway.domain.navigation.dto.response;

import java.util.List;

/*
    역 내 경로 응답

    경로 전체에 하나뿐인 값(총 거리 등)은 여기 두고,
    구간마다 달라지는 값은 steps 에 둔다. 최종 목적지 역 이름을 구간마다
    반복하면 8개가 서로 달라질 수 있는 구조가 된다.
 */
public record RouteResponse(

        int totalDistanceM,
        List<WaypointResponse> waypoints,
        List<RouteStepResponse> steps
) {
}
