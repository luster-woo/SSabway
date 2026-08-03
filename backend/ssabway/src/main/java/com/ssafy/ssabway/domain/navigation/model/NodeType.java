package com.ssafy.ssabway.domain.navigation.model;

/*
    경로 그래프의 노드 종류

    표지판만 사진이 있다. 나머지는 안내 문구와 지도 마커로만 안내한다.
    편의점·ATM 처럼 종류가 늘어날 수 있는 편의시설은 POI 하나로 묶고
    세부 종류는 PoiCategory 로 구분한다. 시설이 추가돼도 이 enum 은 그대로다.
 */
public enum NodeType {

    SIGNAGE,     // 안내 표지판. 앞/뒤 두 면에 사진이 있다
    ELEVATOR,    // 엘리베이터
    EXIT,        // 출구
    GATE,        // 개찰구
    POI          // 편의점·ATM·매표소·발매기 등. category 참고
}
