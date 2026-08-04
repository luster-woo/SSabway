package com.ssafy.ssabway.domain.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/*
    AI 서버(FastAPI)의 POST /predict 응답.

    ai/serve/main.py 와 짝을 이룬다. 필드를 바꿀 때는 그쪽 predict() 의
    반환 dict 도 같이 고쳐야 한다.

    검출 실패(no_detection)와 확신도 미달(low_confidence)은 HTTP 200 으로
    내려온다. AI 서버가 그것을 예외가 아니라 결과로 취급하기 때문이다.
    상태 구분은 status 로 한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SignPredictResult(

        String sign,
        double confidence,
        String status,
        List<Candidate> candidates,
        Integer boxCount,
        Integer elapsedMs
) {

    /* 확신도가 낮을 때 사용자에게 골라달라고 보여줄 후보 */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Candidate(String sign, double confidence) {
    }

    public boolean detected() {
        return !"no_detection".equals(status) && sign != null;
    }

    public boolean confident() {
        return "ok".equals(status);
    }
}
