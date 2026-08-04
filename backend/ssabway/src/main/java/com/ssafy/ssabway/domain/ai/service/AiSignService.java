package com.ssafy.ssabway.domain.ai.service;

import com.ssafy.ssabway.domain.ai.client.AiClient;
import com.ssafy.ssabway.domain.ai.client.SignPredictResult;
import com.ssafy.ssabway.domain.ai.dto.response.SignPredictResponse;
import com.ssafy.ssabway.domain.navigation.model.NavNode;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import com.ssafy.ssabway.domain.navigation.repository.NavigationGraphRepository;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

/*
    사진 한 장을 AI 서버에 보내 어느 표지판인지 알아낸다.

    AI 서버는 표지판 id 만 알고 층은 모른다. 층은 지도 데이터에 있으므로
    여기서 그래프를 찾아 붙인다. DB 를 쓰지 않아 @Transactional 이 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSignService {

    private static final long MAX_IMAGE_BYTES = 15L * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp");

    private final AiClient aiClient;
    private final NavigationGraphRepository navigationGraphRepository;

    public SignPredictResponse predict(MultipartFile image) {

        validate(image);

        SignPredictResult result = aiClient.predictSign(image);

        /*
            사진에 표지판이 없으면 뒤 단계가 전부 무의미하다. 빈 결과를 200 으로
            내리면 화면이 "성공했는데 값이 없는" 상태를 따로 처리해야 하므로
            여기서 404 로 끊고 다시 찍도록 안내한다.
         */
        if (!result.detected()) {
            throw new BusinessException(ErrorCode.AI_SIGN_NOT_DETECTED);
        }

        NavigationGraph graph = navigationGraphRepository.graph();

        log.info("표지판 인식 {} ({}, {}) {}ms",
                result.sign(), result.confidence(), result.status(), result.elapsedMs());

        return new SignPredictResponse(
                result.sign(),
                floorOf(graph, result.sign()),
                result.confidence(),
                result.confident(),
                toCandidates(graph, result.candidates())
        );
    }

    private void validate(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new BusinessException(ErrorCode.AI_IMAGE_REQUIRED);
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException(ErrorCode.AI_IMAGE_TOO_LARGE);
        }

        // 브라우저가 타입을 못 붙이는 경우가 있어(빈 값·application/octet-stream)
        // 타입이 있을 때만 막는다. 진짜 이미지인지는 AI 서버가 다시 검사한다.
        String contentType = image.getContentType();
        if (StringUtils.hasText(contentType)
                && !ALLOWED_TYPES.contains(contentType.toLowerCase())
                && !"application/octet-stream".equalsIgnoreCase(contentType)) {
            throw new BusinessException(ErrorCode.AI_IMAGE_INVALID);
        }
    }

    /*
        모델이 학습한 41개 클래스와 지도 노드가 항상 일치한다는 보장이 없다.
        (지도에서 표지판을 지웠는데 모델은 아직 그 클래스를 들고 있는 경우)
        그때는 층만 비우고 인식 결과 자체는 살린다.
     */
    private String floorOf(NavigationGraph graph, String signId) {
        NavNode node = graph.node(signId);
        if (node == null) {
            log.warn("지도에 없는 표지판을 인식했습니다: {}", signId);
            return null;
        }
        return node.floor();
    }

    private List<SignPredictResponse.Candidate> toCandidates(
            NavigationGraph graph, List<SignPredictResult.Candidate> candidates) {

        if (candidates == null) {
            return List.of();
        }

        return candidates.stream()
                .map(candidate -> new SignPredictResponse.Candidate(
                        candidate.sign(),
                        floorOf(graph, candidate.sign()),
                        candidate.confidence()))
                .toList();
    }
}
