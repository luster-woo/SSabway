package com.ssafy.ssabway.domain.navigation.service;

import com.ssafy.ssabway.domain.navigation.dto.request.RouteRequest;
import com.ssafy.ssabway.domain.navigation.dto.response.RouteResponse;
import com.ssafy.ssabway.domain.navigation.dto.response.RouteStepResponse;
import com.ssafy.ssabway.domain.navigation.dto.response.WaypointResponse;
import com.ssafy.ssabway.domain.navigation.model.NavEdge;
import com.ssafy.ssabway.domain.navigation.model.NavNode;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import com.ssafy.ssabway.domain.navigation.model.NodeType;
import com.ssafy.ssabway.domain.navigation.model.PoiCategory;
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
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
        표지판 사진 주소의 앞부분. S3 버킷의 img 폴더까지를 가리킨다.

        파일명은 "{표지판id}_{면}.jpg" 규칙이라 여기에 이어 붙이면 된다.
        데이터에는 파일명만 두고 주소는 설정에만 두어서, 버킷이나 CDN 이 바뀌어도
        노드·엣지 데이터를 고칠 필요가 없다.
     */
    @Value("${navigation.sign-image-base-url}")
    private String signImageBaseUrl;

    /*
        프론트 서비스워커가 표지판 사진 URL 을 30일 CacheFirst 로 캐싱한다
        (지하 약전파 구간에서도 사진이 뜨게 하려는 의도). 파일명이 같으면 S3
        내용만 바꿔도 이미 캐시를 가진 사용자에겐 옛날 사진이 계속 보인다.
        쿼리스트링에 이 버전을 붙여 두면, 사진을 교체할 때 값만 올려서 배포하는
        것으로 캐시 키 자체를 바꿔 모든 사용자에게 새 사진을 강제할 수 있다.
     */
    @Value("${navigation.sign-image-version}")
    private String signImageVersion;

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

        엘리베이터를 쓰겠다는 요청이 실패했을 때, 계단을 쓰면 갈 수 있는지 한 번 더
        확인한다. 갈 수 있다면 "길이 없다"가 아니라 "계단 없이는 못 간다"이므로
        프론트가 역무원 호출 같은 다른 안내를 띄울 수 있다.

        실제로 대구역 1층은 야외 엘리베이터뿐이라 위층에서 계단 없이 내려갈 수 없다.
        데이터를 고쳐서 해결되는 문제가 아니라 계속 발생한다.
     */
    private Plan findPlan(NavigationGraph graph, RouteRequest request) {
        boolean useElevator = request.useElevatorOrDefault();

        Optional<Plan> plan = routePlanner.plan(
                graph,
                request.startPoint(),
                request.finalPoint(),
                request.effectiveNeeds(),
                request.hasCashOrDefault(),
                useElevator);

        if (plan.isPresent()) {
            return plan.get();
        }

        if (useElevator) {
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

    // 사진이 있는 편의시설. 편의점(STORE)·화장실(TOILET)은 대응 사진이 없어 제외한다.
    private static final Set<PoiCategory> PHOTO_POI_CATEGORIES =
            EnumSet.of(PoiCategory.ATM, PoiCategory.TICKET_OFFICE, PoiCategory.TICKET_MACHINE);

    // 표지판처럼 도착 방향에 따라 다른 면이 찍힌 게 아니라, 시설당 사진이 한 장뿐이다.
    private static final String FACILITY_PHOTO_SIDE = "F";

    /*
        도착지에서 보이는 사진.

        표지판은 도착 방향에 따라 보이는 면(F/B)이 갈리므로 엣지의 arriveSide 를
        따른다. 게이트·ATM·매표소·발매기는 사진이 한 장뿐이라 항상 FACILITY_PHOTO_SIDE
        를 쓴다. 대응 사진이 없는 지점(엘리베이터·편의점·화장실 등)은 null 이다.
        사진이 없다고 경로를 실패시키지 않는다. 안내 문구와 지도만으로도 길은 찾을 수 있다.
     */
    private String buildImageUrl(NavNode arrive, String signSide) {
        if (!hasPhoto(arrive)) {
            return null;
        }
        String side = arrive.type() == NodeType.SIGNAGE ? signSide : FACILITY_PHOTO_SIDE;
        if (side == null) {
            return null;
        }
        return signImageBaseUrl + "/" + arrive.id() + "_" + side + ".jpg?v=" + signImageVersion;
    }

    private boolean hasPhoto(NavNode node) {
        if (node.type() == NodeType.SIGNAGE || node.type() == NodeType.GATE) {
            return true;
        }
        return node.type() == NodeType.POI
                && node.category() != null
                && PHOTO_POI_CATEGORIES.contains(node.category());
    }
}
