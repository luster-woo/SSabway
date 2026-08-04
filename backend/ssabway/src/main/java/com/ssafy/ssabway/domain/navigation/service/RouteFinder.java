package com.ssafy.ssabway.domain.navigation.service;

import com.ssafy.ssabway.domain.navigation.model.NavEdge;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.PriorityQueue;
import java.util.Set;

/*
    다익스트라 최단경로

    A* 를 쓰지 않는 이유가 두 가지 있다.
    노드가 73개뿐이라 아껴봐야 마이크로초 단위이고, 무엇보다 1·2·3층을 한 평면에
    겹쳐 그린 도면이라 두 노드 사이 직선거리가 실제 이동거리와 무관하다.
    잘못된 휴리스틱은 최단경로를 놓치게 만든다.

    useElevator 는 가중치를 늘리는 게 아니라 못 쓰는 쪽을 아예 지나가지 않는다.
    "돌아가더라도 그 수단은 안 됨"이 맞기 때문이다.

        true   계단을 못 쓰는 사용자. 계단 엣지를 뺀다
        false  엘리베이터를 안 쓰겠다는 사용자. 층간 엘리베이터 엣지를 뺀다

    표지판에서 엘리베이터까지 걸어가는 엣지는 그냥 통로라 어느 쪽에서도 막지 않는다.
 */
@Component
public class RouteFinder {

    /* 한 번의 탐색으로 얻은 출발지 기준 거리표. 여러 목적지를 비교할 때 재사용한다 */
    public record Distances(String origin,
                            Map<String, Double> cost,
                            Map<String, String> prevNode,
                            Map<String, String> prevEdge) {

        public boolean canReach(String nodeId) {
            return cost.containsKey(nodeId);
        }

        public double costTo(String nodeId) {
            return cost.getOrDefault(nodeId, Double.MAX_VALUE);
        }
    }

    /* 지나간 노드와 엣지 순서 */
    public record Path(List<String> nodeIds, List<String> edgeIds, double totalWeight) {
    }

    /*
        큐에 담는 항목. 거리를 값으로 들고 있어야 한다.

        비교자가 바깥의 cost 맵을 읽게 만들면, 큐에 이미 들어간 원소의 우선순위가
        나중에 바뀌면서 힙 불변식이 깨진다. 그러면 최단경로가 아닌 답이 나온다.
     */
    private record Entry(String nodeId, double distance) {
    }

    /*
        origin 에서 모든 노드까지의 최단거리를 한 번에 구한다.

        경유지 후보가 여러 곳일 때(충전 가능한 곳 5곳 등) 목적지마다 탐색을
        반복할 필요가 없다. 한 번 돌리고 후보들의 거리를 비교하면 된다.
     */
    public Distances distancesFrom(NavigationGraph graph, String origin, boolean useElevator) {

        Map<String, Double> cost = new HashMap<>();
        Map<String, String> prevNode = new HashMap<>();
        Map<String, String> prevEdge = new HashMap<>();
        Set<String> settled = new HashSet<>();

        PriorityQueue<Entry> queue =
                new PriorityQueue<>(Comparator.comparingDouble(Entry::distance));

        cost.put(origin, 0.0);
        queue.add(new Entry(origin, 0.0));

        while (!queue.isEmpty()) {
            Entry entry = queue.poll();
            String current = entry.nodeId();
            if (!settled.add(current)) {
                continue;                     // 큐에 중복으로 들어간 것. 이미 확정됨
            }

            for (NavEdge edge : graph.edgesOf(current)) {
                if (blocked(graph, edge, useElevator)) {
                    continue;
                }
                if (!edge.traversableFrom(current)) {
                    continue;                 // 단방향 엣지를 역방향으로 지나려는 경우
                }

                String next = edge.opposite(current);
                if (settled.contains(next)) {
                    continue;
                }

                double candidate = entry.distance() + edge.weight();
                if (candidate < cost.getOrDefault(next, Double.MAX_VALUE)) {
                    cost.put(next, candidate);
                    prevNode.put(next, current);
                    prevEdge.put(next, edge.id());
                    // decrease-key 대신 중복으로 넣고 settled 로 걸러낸다
                    queue.add(new Entry(next, candidate));
                }
            }
        }

        return new Distances(origin, cost, prevNode, prevEdge);
    }

    /* 이미 구한 거리표에서 goal 까지의 경로를 되짚는다 */
    public Optional<Path> pathTo(Distances distances, String goal) {
        if (!distances.canReach(goal)) {
            return Optional.empty();
        }

        List<String> nodeIds = new ArrayList<>();
        List<String> edgeIds = new ArrayList<>();

        String cursor = goal;
        while (cursor != null) {
            nodeIds.add(cursor);
            String edgeId = distances.prevEdge().get(cursor);
            if (edgeId != null) {
                edgeIds.add(edgeId);
            }
            cursor = distances.prevNode().get(cursor);
        }
        Collections.reverse(nodeIds);
        Collections.reverse(edgeIds);

        return Optional.of(new Path(nodeIds, edgeIds, distances.costTo(goal)));
    }

    /* 이번 요청에서 쓸 수 없는 구간인가 */
    private boolean blocked(NavigationGraph graph, NavEdge edge, boolean useElevator) {
        return useElevator ? edge.containsStairs() : graph.isElevatorRide(edge);
    }

    /* 두 점 사이 최단경로. 경유지가 없을 때 쓴다 */
    public Optional<Path> find(NavigationGraph graph, String start, String goal, boolean useElevator) {
        if (start.equals(goal)) {
            return Optional.of(new Path(List.of(start), List.of(), 0));
        }
        return pathTo(distancesFrom(graph, start, useElevator), goal);
    }
}
