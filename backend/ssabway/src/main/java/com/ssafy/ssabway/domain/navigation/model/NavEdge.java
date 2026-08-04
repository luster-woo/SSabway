package com.ssafy.ssabway.domain.navigation.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/*
    경로 그래프의 엣지 (두 노드를 잇는 통로 한 구간)

    geometry 는 통로가 꺾이는 모양까지 담은 좌표열이다. 105개 중 20개가
    직선이 아니라, 노드끼리 직선으로 이으면 벽을 뚫는 선이 그려진다.
    다만 응답에는 싣지 않는다. 프론트가 지도 JSON 을 이미 갖고 있어서
    edgeId 로 찾으면 되기 때문이다.

    arriveSide 는 "이 엣지를 타고 그 노드에 도착했을 때 보이는 표지판 면"이다.
    같은 엣지라도 방향에 따라 답이 다르므로 도착 노드 id 를 키로 쓴다.

        { "S1_05": "F", "S1_06": "B" }
        S1_06 에서 와서 S1_05 에 도착하면 앞면,
        반대로 오면 S1_06 의 뒷면이 보인다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NavEdge(

        String id,
        String from,
        String to,
        boolean bidirectional,
        boolean containsStairs,   // 계단·에스컬레이터 포함
        double weight,            // 구간 길이 (지도 단위)
        Map<String, String> arriveSide,
        List<Point> geometry
) {

    public NavEdge {
        arriveSide = (arriveSide == null) ? Map.of() : Map.copyOf(arriveSide);
        geometry = (geometry == null) ? List.of() : List.copyOf(geometry);
    }

    /* nodeId 에서 출발해 이 엣지를 지날 때 도착하는 반대편 노드 */
    public String opposite(String nodeId) {
        if (from.equals(nodeId)) return to;
        if (to.equals(nodeId)) return from;
        throw new IllegalArgumentException("엣지 " + id + " 는 노드 " + nodeId + " 와 연결되어 있지 않습니다.");
    }

    /* nodeId 에서 출발해 지날 수 있는가 (단방향이면 from -> to 만 허용) */
    public boolean traversableFrom(String nodeId) {
        if (from.equals(nodeId)) return true;
        return bidirectional && to.equals(nodeId);
    }

    /* 이 엣지를 타고 arriveNodeId 에 도착했을 때 보이는 면. 표지판이 아니면 null */
    public String sideAt(String arriveNodeId) {
        return arriveSide.get(arriveNodeId);
    }
}
