package com.ssafy.ssabway.domain.navigation.repository;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tools.jackson.databind.ObjectMapper;
import com.ssafy.ssabway.global.common.Language;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Repository;

import java.io.InputStream;
import java.util.Locale;
import java.util.Map;

/*
    구간별 안내 문구 (한국어·영어·일본어·중국어)

    프론트가 번들로 들고 있게 하지 않고 서버가 내려준다.
    좌표나 통로 모양과 달리 문구는 계속 다듬는 콘텐츠라, 앱을 다시 배포하지 않고
    고칠 수 있어야 한다.

    키는 "{엣지id}:{도착노드id}" 다. 같은 엣지라도 방향에 따라 문구가 다르다.
        E060:S1_06   S1_05 에서 S1_06 으로 갈 때
        E060:S1_05   그 반대
 */
@Slf4j
@Repository
public class GuideTextRepository {

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final String location;

    private Map<String, Direction> directions;

    public GuideTextRepository(ResourceLoader resourceLoader,
                               ObjectMapper objectMapper,
                               @Value("${navigation.guide-location}") String location) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.location = location;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GuideFile(Map<String, Direction> directions) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Direction(Map<String, String> text) {
    }

    @PostConstruct
    void load() {
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("안내 문구 파일을 찾을 수 없습니다: " + location);
        }

        try (InputStream in = resource.getInputStream()) {
            GuideFile file = objectMapper.readValue(in, GuideFile.class);
            directions = file.directions();
            log.info("안내 문구 로드 완료 — 방향 {}개", directions.size());
        } catch (Exception e) {
            throw new IllegalStateException("안내 문구를 읽지 못했습니다: " + location, e);
        }
    }

    /*
        해당 방향의 안내 문구.

        문구가 없어도 경로 안내는 되어야 하므로 예외를 던지지 않고 null 을 준다.
        노드를 새로 추가하고 문구를 아직 안 쓴 경우가 여기에 해당한다.
     */
    public String find(String edgeId, String arriveNodeId, Language language) {
        Direction direction = directions.get(edgeId + ":" + arriveNodeId);
        if (direction == null || direction.text() == null) {
            return null;
        }
        // 파일은 소문자 키(ko/en/ja/zh), Language enum 은 대문자다
        return direction.text().get(language.name().toLowerCase(Locale.ROOT));
    }
}
