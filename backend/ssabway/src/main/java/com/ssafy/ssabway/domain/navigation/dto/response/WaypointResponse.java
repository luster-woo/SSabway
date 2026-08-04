package com.ssafy.ssabway.domain.navigation.dto.response;

import com.ssafy.ssabway.domain.navigation.model.PoiCategory;
import com.ssafy.ssabway.domain.navigation.model.Purpose;

/*
    들러야 하는 곳 요약

    경로를 받자마자 "총 두 군데를 들르는구나"를 보여줄 수 있도록 최상위에 둔다.
    구간마다 반복하지 않는다.
 */
public record WaypointResponse(

        Purpose purpose,
        String nodeId,
        PoiCategory category
) {
}
