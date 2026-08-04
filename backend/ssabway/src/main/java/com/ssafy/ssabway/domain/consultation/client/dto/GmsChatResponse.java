package com.ssafy.ssabway.domain.consultation.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

// GMS Chat Completions 응답에서 요약문 추출에 필요한 필드만 받음
@JsonIgnoreProperties(ignoreUnknown = true)
public record GmsChatResponse(
        List<Choice> choices
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Choice(
            Message message
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Message(
            String role,
            String content
    ) {
    }
}