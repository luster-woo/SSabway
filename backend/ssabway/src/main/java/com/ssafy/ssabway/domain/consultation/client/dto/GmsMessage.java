package com.ssafy.ssabway.domain.consultation.client.dto;

// GMS Chat API에 전달하는 역할별 메시지입니다.
public record GmsMessage(
        String role,
        String content
) {
}