package com.ssafy.ssabway.domain.route.service;

import com.ssafy.ssabway.domain.route.client.OdsayClient;
import com.ssafy.ssabway.domain.route.client.OdsayRouteResponse;
import com.ssafy.ssabway.domain.route.dto.request.RouteSearchRequest;
import com.ssafy.ssabway.domain.route.dto.response.RouteResponse;
import com.ssafy.ssabway.domain.route.dto.response.RouteSearchResponse;
import com.ssafy.ssabway.domain.route.dto.response.RouteSegmentResponse;
import com.ssafy.ssabway.domain.route.entity.StartPoint;
import com.ssafy.ssabway.domain.route.entity.SubwayLane;
import com.ssafy.ssabway.global.common.Language;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

/*
    ODsay 응답을 우리 형식으로 변환한다. DB를 쓰지 않으므로 @Transactional이 없다.
 */
@Service
@RequiredArgsConstructor
public class RouteService {

    // pathType: 1-지하철, 2-버스, 3-버스+지하철
    private static final int SUBWAY_PATH = 1;
    // trafficType: 1-지하철, 2-버스, 3-도보
    private static final int SUBWAY_TRAFFIC = 1;

    /*
        실내 안내 데이터(points/edges)를 보유한 역.
        여기 없는 역에서 출발하는 경로는 안내가 성립하지 않으므로 응답에서 제외

        역 데이터가 늘면 이 Set에 추가하면 됨.
        더 늘어나면 stations 조회로 바꿀 수 있고, 그때도 요청 형태는 바뀌지 않음.
     */
    private static final Set<String> SUPPORTED_START_STATIONS = Set.of("대구역");

    private final OdsayClient odsayClient;

    public RouteSearchResponse searchPath(RouteSearchRequest request) {

        OdsayRouteResponse odsayResponse = odsayClient.searchSubwayPath(
                request.language(), request.startX(), request.startY(),
                request.endX(), request.endY());

        List<RouteResponse> paths = odsayResponse.result().path().stream()
                // SearchPathType=1로 요청했지만 방어적으로 한 번 더 걸러낸다
                .filter(path -> path.pathType() == SUBWAY_PATH)
                /*
                    ODsay는 출발 좌표 반경 700m(startRadius) 안의 역을 후보로 삼는다.
                    대구역 근처에 달성공원역이 있어 그쪽에서 출발하는 경로가 섞여 들어온다.
                    실내 안내 데이터가 없는 역이므로 카드를 보여줘도 안내할 수 없다.
                 */
                .filter(this::startsFromSupportedStation)
                .map(path -> toRouteResponse(path, request.language()))
                // ODsay는 소요시간 순으로 주지 않는다(실제 응답에서 33 → 30 확인).
                // 정렬해두면 path[0]이 곧 "빠른 길"이 되어 별도 플래그가 불필요하다
                .sorted(Comparator.comparingInt(RouteResponse::totalTime))
                .toList();

        if (paths.isEmpty()) throw new BusinessException(ErrorCode.SUBWAY_ROUTE_NOT_FOUND);

        return new RouteSearchResponse(paths);
    }

    private RouteResponse toRouteResponse(OdsayRouteResponse.Path path, Language language) {

        List<RouteSegmentResponse> segments = path.subPath().stream()
                // ⚠️ 이 필터가 먼저 와야 한다. 도보 구간에는 lane이 null이라
                //    걸러내지 않고 toSegment를 부르면 NPE가 난다
                .filter(subPath -> subPath.trafficType() == SUBWAY_TRAFFIC)
                .map(subPath -> toSegment(subPath, language))
                .toList();

        return new RouteResponse(
                path.info().firstStartStation(),
                path.info().lastEndStation(),
                path.info().totalTime(),
                path.info().payment(),
                segments.size() - 1,
                segments);
    }

    private RouteSegmentResponse toSegment(OdsayRouteResponse.SubPath subPath, Language language) {
        OdsayRouteResponse.Lane lane = subPath.lane().getFirst();
        SubwayLane subwayLane = SubwayLane.from(lane.subwayCode());

        String startKor = startNameKorOf(subPath);

        return new RouteSegmentResponse(
                subwayLane,
                lane.name(),
                subPath.wayCode(),
                subwayLane.directionOf(subPath.wayCode(), language),
                StartPoint.codeOf(startKor, subwayLane, subPath.wayCode()),
                subPath.startName(),
                subPath.endName(),
                subPath.stationCount(),
                subPath.sectionTime());
    }

    /*
        첫 지하철 구간의 출발역이 우리가 지원하는 역인지 확인한다.

        ⚠️ 반드시 startNameKor(한국어 원문)로 비교해야 한다. lang을 전달하면
           startName은 요청 언어로 번역되어 오므로 언어별로 비교값이 갈린다.
           lang=0일 때는 ~Kor가 오지 않아 startName 자체가 한국어다.
     */
    private boolean startsFromSupportedStation(OdsayRouteResponse.Path path) {
        return path.subPath().stream()
                .filter(subPath -> subPath.trafficType() == SUBWAY_TRAFFIC)
                .findFirst()
                .map(this::startNameKorOf)
                .filter(SUPPORTED_START_STATIONS::contains)
                .isPresent();
    }

    private String startNameKorOf(OdsayRouteResponse.SubPath subPath) {
        return subPath.startNameKor() != null ? subPath.startNameKor() : subPath.startName();
    }
}