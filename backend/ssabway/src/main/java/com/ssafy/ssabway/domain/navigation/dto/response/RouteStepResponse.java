package com.ssafy.ssabway.domain.navigation.dto.response;

import com.ssafy.ssabway.domain.navigation.model.NodeType;
import com.ssafy.ssabway.domain.navigation.model.PoiCategory;
import com.ssafy.ssabway.domain.navigation.model.Purpose;

/*
    경로의 한 구간

    좌표와 통로 모양(geometry)은 싣지 않는다. 프론트가 지도 JSON 을 갖고 있어서
    edgeId 로 직접 찾으면 되고, 그쪽이 응답도 가볍다.

    edgeId 는 한 응답 안에서 중복될 수 있다. 편의점처럼 막다른 갈래를 들렀다
    되돌아 나오면 같은 엣지를 두 번 지나기 때문이다. 목록의 key 로 쓰면 안 된다.
 */
public record RouteStepResponse(

        String edgeId,
        String from,
        String to,
        NodeType arriveType,
        PoiCategory arriveCategory,   // POI 일 때만
        String text,                  // 선택한 언어의 안내 문구
        String imageUrl,              // 표지판 도착일 때만
        Purpose arrivedFor            // 경유지에 도착하는 구간에만. 지나가기만 하면 null
) {
}
