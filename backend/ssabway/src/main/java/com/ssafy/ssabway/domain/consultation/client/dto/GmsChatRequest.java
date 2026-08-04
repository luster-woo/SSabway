package com.ssafy.ssabway.domain.consultation.client.dto;

import java.util.List;

// GMS의 OpenAI 호환 Chat Completions 요청입니다.
public record GmsChatRequest(
        String model,
        List<GmsMessage> messages,
        boolean stream
) {
}