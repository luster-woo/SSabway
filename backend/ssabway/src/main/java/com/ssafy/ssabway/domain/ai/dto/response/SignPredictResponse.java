package com.ssafy.ssabway.domain.ai.dto.response;

import java.util.List;

/*
    표지판 인식 결과.

    signageId 는 지도 노드 id 와 같은 값이라(S3_02) 길안내의 출발 지점으로
    그대로 넘길 수 있다.

    확신도가 낮아도 signageId 를 비우지 않는다. 감추는 것보다 "이거 맞나요?"
    하고 확인받는 편이 낫고, 그 판단은 화면이 confident 로 한다.
 */
public record SignPredictResponse(

        String signageId,
        String floor,
        String stationName,
        double confidence,

        /* true 면 그대로 사용, false 면 candidates 를 보여주고 사용자에게 고르게 한다 */
        boolean confident,

        List<Candidate> candidates
) {

    public record Candidate(String signageId, String floor, double confidence) {
    }
}
