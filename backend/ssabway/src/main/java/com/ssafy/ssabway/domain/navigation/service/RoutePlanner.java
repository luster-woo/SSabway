package com.ssafy.ssabway.domain.navigation.service;

import com.ssafy.ssabway.domain.navigation.model.NavNode;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import com.ssafy.ssabway.domain.navigation.model.Purpose;
import com.ssafy.ssabway.domain.navigation.service.RouteFinder.Distances;
import com.ssafy.ssabway.domain.navigation.service.RouteFinder.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/*
    개찰 전에 어디를 들러야 하는지 정하고, 그 경유지를 지나는 최단경로를 만든다.

    분기는 이렇다.

        카드 있고 잔액 충분   →  경유 없음
        카드 있고 잔액 부족   →  충전   (편의점 · 매표소)
        카드 없음            →  구매   (편의점 — 구매와 충전을 한 번에)
        1회권                →  발권   (발매기)

        현금이 없으면 위 앞에 ATM 이 하나 붙는다.
        충전은 현금으로만 되기 때문에, 카드로 교통카드를 살 수 있어도
        결국 충전을 해야 해서 현금이 필요하다.

    경유지는 최대 2곳이다. 편의점에서 구매와 충전이 한 번에 되므로 3단 경유는 없다.
 */
@Component
@RequiredArgsConstructor
public class RoutePlanner {

    private final RouteFinder routeFinder;

    /* 한 구간. 경유지에 도착하는 구간이면 arrivedFor 에 이유가 담긴다 */
    public record Leg(Path path, Purpose purpose, String destination) {
    }

    public record Plan(List<Leg> legs, double totalWeight) {

        public List<String> waypointIds() {
            // 마지막 구간(개찰구)은 경유지가 아니다
            List<String> ids = new ArrayList<>();
            for (int i = 0; i < legs.size() - 1; i++) {
                ids.add(legs.get(i).destination());
            }
            return ids;
        }
    }

    /*
        경유지를 정하고 경로를 만든다.

        needs 가 null 이면(바로 탑승) 출발지에서 개찰구까지 한 번에 간다.
        경로를 못 찾으면 비어 있는 값을 돌려준다. 어떤 에러로 볼지는 서비스가 정한다.
     */
    public Optional<Plan> plan(NavigationGraph graph,
                               String start,
                               String goal,
                               Purpose needs,
                               boolean hasCash,
                               boolean useElevator) {

        if (needs == null) {
            return routeFinder.find(graph, start, goal, useElevator)
                    .map(p -> new Plan(List.of(new Leg(p, Purpose.TO_GATE, goal)), p.totalWeight()));
        }

        boolean needsCash = !hasCash;
        return needsCash
                ? planWithCash(graph, start, goal, needs, useElevator)
                : planDirect(graph, start, goal, needs, useElevator);
    }

    /* 현금이 있는 경우: 출발 → (시설) → 개찰구 */
    private Optional<Plan> planDirect(NavigationGraph graph, String start, String goal,
                                      Purpose needs, boolean useElevator) {

        List<NavNode> candidates = graph.nodesFor(needs);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        Distances fromStart = routeFinder.distancesFrom(graph, start, useElevator);
        Distances fromGoal = routeFinder.distancesFrom(graph, goal, useElevator);

        NavNode best = null;
        double bestCost = Double.MAX_VALUE;
        for (NavNode c : candidates) {
            if (!fromStart.canReach(c.id()) || !fromGoal.canReach(c.id())) {
                continue;
            }
            double total = fromStart.costTo(c.id()) + fromGoal.costTo(c.id());
            if (total < bestCost) {
                bestCost = total;
                best = c;
            }
        }
        if (best == null) {
            return Optional.empty();
        }

        return buildPlan(graph, useElevator, goal,
                List.of(new Stop(best.id(), needs, fromStart)));
    }

    /*
        현금이 없는 경우: 출발 → ATM → (시설) → 개찰구

        각 단계에서 가장 가까운 곳을 고르면 전체가 최단이 아니다.
        가까운 ATM 이 반대편에 있으면 갔다가 되돌아오게 된다.
        후보가 적으니 조합을 전부 따져 전체 길이가 가장 짧은 쌍을 고른다.

        ATM 2곳 × 시설 5곳 = 10가지인데, 다익스트라는 4번만 돌린다.
        (출발 1 + ATM 2 + 개찰구 1). 나머지는 덧셈으로 비교한다.
     */
    private Optional<Plan> planWithCash(NavigationGraph graph, String start, String goal,
                                        Purpose needs, boolean useElevator) {

        List<NavNode> atms = graph.nodesFor(Purpose.WITHDRAW_CASH);
        List<NavNode> facilities = graph.nodesFor(needs);
        if (atms.isEmpty() || facilities.isEmpty()) {
            return Optional.empty();
        }

        Distances fromStart = routeFinder.distancesFrom(graph, start, useElevator);
        Distances fromGoal = routeFinder.distancesFrom(graph, goal, useElevator);

        NavNode bestAtm = null;
        NavNode bestFacility = null;
        Distances bestFromAtm = null;
        double bestCost = Double.MAX_VALUE;

        for (NavNode atm : atms) {
            if (!fromStart.canReach(atm.id())) {
                continue;
            }
            Distances fromAtm = routeFinder.distancesFrom(graph, atm.id(), useElevator);

            for (NavNode f : facilities) {
                if (!fromAtm.canReach(f.id()) || !fromGoal.canReach(f.id())) {
                    continue;
                }
                double total = fromStart.costTo(atm.id())
                        + fromAtm.costTo(f.id())
                        + fromGoal.costTo(f.id());
                if (total < bestCost) {
                    bestCost = total;
                    bestAtm = atm;
                    bestFacility = f;
                    bestFromAtm = fromAtm;
                }
            }
        }
        if (bestAtm == null) {
            return Optional.empty();
        }

        return buildPlan(graph, useElevator, goal, List.of(
                new Stop(bestAtm.id(), Purpose.WITHDRAW_CASH, fromStart),
                new Stop(bestFacility.id(), needs, bestFromAtm)));
    }

    /*
        경유지 하나.
        distances 는 "직전 지점에서 잰 거리표"라, 여기서 경로를 그대로 되짚을 수 있다.
     */
    private record Stop(String nodeId, Purpose purpose, Distances distances) {
    }

    /*
        경유 순서대로 구간을 이어 붙인다.

        경유지까지의 경로는 이미 계산해 둔 거리표에서 되짚고,
        마지막 경유지에서 개찰구까지만 새로 탐색한다.
     */
    private Optional<Plan> buildPlan(NavigationGraph graph, boolean useElevator,
                                     String goal, List<Stop> stops) {

        List<Leg> legs = new ArrayList<>();
        double total = 0;

        for (Stop stop : stops) {
            Optional<Path> path = routeFinder.pathTo(stop.distances(), stop.nodeId());
            if (path.isEmpty()) {
                return Optional.empty();
            }
            legs.add(new Leg(path.get(), stop.purpose(), stop.nodeId()));
            total += path.get().totalWeight();
        }

        String lastStop = stops.get(stops.size() - 1).nodeId();
        Optional<Path> toGate = routeFinder.find(graph, lastStop, goal, useElevator);
        if (toGate.isEmpty()) {
            return Optional.empty();
        }
        legs.add(new Leg(toGate.get(), Purpose.TO_GATE, goal));
        total += toGate.get().totalWeight();

        return Optional.of(new Plan(legs, total));
    }
}
