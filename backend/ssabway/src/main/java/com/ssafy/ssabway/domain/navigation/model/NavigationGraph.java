package com.ssafy.ssabway.domain.navigation.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*
    노드·엣지와 인접 리스트를 함께 들고 있는 그래프

    JSON 을 읽을 때 한 번만 만들고 이후에는 읽기만 한다.
    노드 73개 · 엣지 105개라 통째로 메모리에 두어도 부담이 없다.
 */
public class NavigationGraph {

    private final Map<String, NavNode> nodes;
    private final Map<String, NavEdge> edges;
    private final Map<String, List<NavEdge>> adjacency;
    private final double unitsPerMeter;

    public NavigationGraph(List<NavNode> nodeList, List<NavEdge> edgeList, double unitsPerMeter) {
        this.nodes = new HashMap<>();
        for (NavNode n : nodeList) {
            nodes.put(n.id(), n);
        }

        this.edges = new HashMap<>();
        this.adjacency = new HashMap<>();
        for (NavEdge e : edgeList) {
            edges.put(e.id(), e);
            // 단방향 엣지도 양쪽 인접 리스트에 넣는다.
            // 지나갈 수 있는지는 traversableFrom 이 따로 판단한다.
            adjacency.computeIfAbsent(e.from(), k -> new ArrayList<>()).add(e);
            adjacency.computeIfAbsent(e.to(), k -> new ArrayList<>()).add(e);
        }

        this.unitsPerMeter = unitsPerMeter > 0 ? unitsPerMeter : 1;
    }

    public NavNode node(String id) {
        return nodes.get(id);
    }

    public boolean hasNode(String id) {
        return nodes.containsKey(id);
    }

    public NavEdge edge(String id) {
        return edges.get(id);
    }

    public List<NavEdge> edgesOf(String nodeId) {
        return adjacency.getOrDefault(nodeId, List.of());
    }

    public List<NavNode> allNodes() {
        return List.copyOf(nodes.values());
    }

    public int nodeCount() {
        return nodes.size();
    }

    public int edgeCount() {
        return edges.size();
    }

    /* 지도 단위 길이를 미터로 */
    public int toMeters(double units) {
        return (int) Math.round(units / unitsPerMeter);
    }

    /* purpose 를 해결할 수 있는 시설 목록 (충전 가능한 곳 등) */
    public List<NavNode> nodesFor(Purpose purpose) {
        List<NavNode> found = new ArrayList<>();
        for (NavNode n : nodes.values()) {
            if (n.supports(purpose)) {
                found.add(n);
            }
        }
        return found;
    }
}
