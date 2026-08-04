package com.ssafy.ssabway.domain.consultation.dto.response;

import com.ssafy.ssabway.global.common.Language;

import java.time.LocalDateTime;

public record WaitingResponse(
        Long consultationId,
        String email,
        String departure,
        String destination,
        Language language,
        LocalDateTime requestedAt) {
}
