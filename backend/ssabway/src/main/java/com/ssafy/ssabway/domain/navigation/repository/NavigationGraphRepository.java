package com.ssafy.ssabway.domain.navigation.repository;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssabway.domain.navigation.model.NavEdge;
import com.ssafy.ssabway.domain.navigation.model.NavNode;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Repository;

import java.io.InputStream;
import java.util.List;

/*
    지도 편집 툴이 내보낸 daegu_navigation.json 을 읽어 그래프로 만든다.

    역 구조는 공사가 없는 한 바뀌지 않으므로 기동할 때 한 번만 읽고 메모리에 둔다.
    노드 73개 · 엣지 105개라 부담이 없다.
 */
@Slf4j
@Repository
public class NavigationGraphRepository {

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final String location;

    private NavigationGraph graph;

    public NavigationGraphRepository(ResourceLoader resourceLoader,
                                     ObjectMapper objectMapper,
                                     @Value("${navigation.graph-location}") String location) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.location = location;
    }

    /* JSON 최상위 구조 */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GraphFile(SvgMeta svg, List<NavNode> nodes, List<NavEdge> edges) {
    }

    /*
        좌표계 정보.
        viewBox 는 프론트가 쓰고, 서버는 거리를 미터로 바꿀 때 unitsPerMeter 만 쓴다.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SvgMeta(String file, List<Double> viewBox, double unitsPerMeter) {
    }

    @PostConstruct
    void load() {
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            // 여기서 막지 않으면 첫 요청에서야 알게 된다. 기동 때 바로 드러내는 편이 낫다.
            throw new IllegalStateException("경로 그래프 파일을 찾을 수 없습니다: " + location);
        }

        try (InputStream in = resource.getInputStream()) {
            GraphFile file = objectMapper.readValue(in, GraphFile.class);
            double unitsPerMeter = file.svg() != null ? file.svg().unitsPerMeter() : 1;
            graph = new NavigationGraph(file.nodes(), file.edges(), unitsPerMeter);

            log.info("경로 그래프 로드 완료 — 노드 {}개, 엣지 {}개, 1m = {} 단위",
                    graph.nodeCount(), graph.edgeCount(), unitsPerMeter);
        } catch (Exception e) {
            throw new IllegalStateException("경로 그래프를 읽지 못했습니다: " + location, e);
        }
    }

    public NavigationGraph graph() {
        return graph;
    }
}
