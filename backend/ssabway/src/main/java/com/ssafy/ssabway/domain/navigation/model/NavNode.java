package com.ssafy.ssabway.domain.navigation.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/*
    경로 그래프의 노드

    id 는 지도 편집 툴이 부여한다. 표지판은 S3_02 처럼 층이 들어가고,
    시설은 EV2_01 · CO0_01 처럼 종류와 층이 들어간다.
    출발지로 들어오는 값은 표지판 인식 모델이 내놓는 id 와 같다.

    floor 는 안내 문구에 쓰려던 값인데 지금은 쓰지 않는다. 경로 탐색·사진 선택·
    좌표 어디에도 관여하지 않으므로 실제 층과 어긋나 있어도 동작에 영향이 없다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NavNode(

        String id,
        NodeType type,
        PoiCategory category,   // POI 일 때만 값이 있다
        String floor,
        double x,
        double y
) {

    public Point point() {
        return new Point(x, y);
    }

    /* 이 노드에서 purpose 를 해결할 수 있는가 (편의점에서 충전 가능한가 등) */
    public boolean supports(Purpose purpose) {
        return type == NodeType.POI && category != null && category.supports(purpose);
    }
}
