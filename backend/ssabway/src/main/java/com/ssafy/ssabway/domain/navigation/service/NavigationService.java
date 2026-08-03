package com.ssafy.ssabway.domain.navigation.service;

import com.ssafy.ssabway.domain.navigation.dto.request.RouteRequest;
import com.ssafy.ssabway.domain.navigation.dto.response.RouteResponse;
import com.ssafy.ssabway.domain.navigation.dto.response.RouteStepResponse;
import com.ssafy.ssabway.domain.navigation.dto.response.WaypointResponse;
import com.ssafy.ssabway.domain.navigation.model.NavEdge;
import com.ssafy.ssabway.domain.navigation.model.NavNode;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import com.ssafy.ssabway.domain.navigation.model.NodeType;
import com.ssafy.ssabway.domain.navigation.model.Purpose;
import com.ssafy.ssabway.domain.navigation.repository.GuideTextRepository;
import com.ssafy.ssabway.domain.navigation.repository.NavigationGraphRepository;
import com.ssafy.ssabway.domain.navigation.service.RoutePlanner.Leg;
import com.ssafy.ssabway.domain.navigation.service.RoutePlanner.Plan;
import com.ssafy.ssabway.global.common.Language;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/*
    경로를 찾아 화면에 필요한 형태로 조립한다.

    탐색은 RouteFinder, 어디를 들를지는 RoutePlanner 가 정하고
    여기서는 안내 문구와 사진을 붙여 응답을 만든다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NavigationService {

    private final NavigationGraphRepository graphRepository;
    private final GuideTextRepository guideTextRepository;
    private final RoutePlanner routePlanner;

    /*
        표지판 사진 주소의 앞부분.

        지금은 "{base}/{표지판id}_{면}.jpg" 로 만든다. S3 에 어떤 구조로 올릴지
        정해지면 buildImageUrl 한 곳만 고치면 된다.
     */
    @Value("${navigation.sign-image-base-url}")
    private String signImageBaseUrl;

    public RouteResponse findRoute(RouteRequest request) {
        NavigationGraph graph = graphRepository.graph();
        if (graph == null) {
            throw new BusinessException(ErrorCode.NAV_GRAPH_NOT_LOADED);
        }

        if (!graph.hasNode(request.startPoint()) || !graph.hasNode(request.finalPoint())) {
            throw new BusinessException(ErrorCode.NAV_NODE_NOT_FOUND);
        }
        if (!request.hasValidNeeds()) {
            // 교통카드가 준비되지 않았는데 무엇이 필요한지 없으면 어디로 안내할지 정할 수 없다
            throw new BusinessException(ErrorCode.NAV_NEEDS_REQUIRED);
        }

        Plan plan = findPlan(graph, request);

        return new RouteResponse(
                graph.toMeters(plan.totalWeight()),
                toWaypoints(graph, plan),
                toSteps(graph, plan, request.langCode()));
    }

    /*
        경로를 찾고, 실패하면 왜 실패했는지 구분한다.

        계단을 피해 달라는 요청이 실패했을 때, 계단을 허용하면 갈 수 있는 경로가
        있는지 한 번 더 확인한다. 있다면 "길이 없다"가 아니라 "계단 없이는 못 간다"이므로
        프론트가 역무원 호출 같은 다른 안내를 띄울 수 있다.

        실제로 대구역 1층은 야외 엘리베이터뿐이라 위층에서 계단 없이 내려갈 수 없다.
        데이터를 고쳐서 해결되는 문제가 아니라 계속 발생한다.
     */
    private Plan findPlan(NavigationGraph graph, RouteRequest request) {
        boolean avoidStairs = request.avoidStairsOrDefault();

        Optional<Plan> plan = routePlanner.plan(
                graph,
                request.startPoint(),
                request.finalPoint(),
                request.effectiveNeeds(),
                request.hasCashOrDefault(),
                avoidStairs);

        if (plan.isPresent()) {
            return plan.get();
        }

        if (avoidStairs) {
            boolean reachableWithStairs = routePlanner.plan(
                    graph,
                    request.startPoint(),
                    request.finalPoint(),
                    request.effectiveNeeds(),
                    request.hasCashOrDefault(),
                    false).isPresent();

            if (reachableWithStairs) {
                throw new BusinessException(ErrorCode.NAV_NO_STEP_FREE_ROUTE);
            }
        }

        throw new BusinessException(ErrorCode.NAV_ROUTE_NOT_FOUND);
    }

    private List<WaypointResponse> toWaypoints(NavigationGraph graph, Plan plan) {
        List<WaypointResponse> waypoints = new ArrayList<>();
        // 마지막 구간은 개찰구라 경유지가 아니다
        for (int i = 0; i < plan.legs().size() - 1; i++) {
            Leg leg = plan.legs().get(i);
            NavNode node = graph.node(leg.destination());
            waypoints.add(new WaypointResponse(leg.purpose(), leg.destination(), node.category()));
        }
        return waypoints;
    }

    private List<RouteStepResponse> toSteps(NavigationGraph graph, Plan plan, Language language) {
        List<RouteStepResponse> steps = new ArrayList<>();

        for (Leg leg : plan.legs()) {
            List<String> nodeIds = leg.path().nodeIds();
            List<String> edgeIds = leg.path().edgeIds();

            for (int i = 0; i < edgeIds.size(); i++) {
                NavEdge edge = graph.edge(edgeIds.get(i));
                String from = nodeIds.get(i);
                String to = nodeIds.get(i + 1);
                NavNode arrive = graph.node(to);

                // 구간의 마지막에서만 "여기서 무엇을 하라"를 알린다.
                // 중간에 스쳐 지나가는 경유지는 null 이어야 사용자가 헷갈리지 않는다.
                boolean isLegEnd = (i == edgeIds.size() - 1);
                Purpose arrivedFor = (isLegEnd && leg.purpose() != Purpose.TO_GATE)
                        ? leg.purpose() : null;

                steps.add(new RouteStepResponse(
                        edge.id(),
                        from,
                        to,
                        arrive.type(),
                        arrive.category(),
                        guideTextRepository.find(edge.id(), to, language),
                        buildImageUrl(arrive, edge.sideAt(to)),
                        arrivedFor));
            }
        }
        return steps;
    }

    /*
        도착지에서 보이는 표지판 사진.

        표지판이 아니거나(엘리베이터·편의점 등) 어느 면이 보이는지 정해지지 않았으면
        null 이다. 사진이 없다고 경로를 실패시키지 않는다. 안내 문구와 지도만으로도
        길은 찾을 수 있다.
     */
    private String buildImageUrl(NavNode arrive, String side) {
        if (arrive.type() != NodeType.SIGNAGE || side == null) {
            return null;
        }
        return signImageBaseUrl + "/" + arrive.id() + "_" + side + ".jpg";
    }
}
