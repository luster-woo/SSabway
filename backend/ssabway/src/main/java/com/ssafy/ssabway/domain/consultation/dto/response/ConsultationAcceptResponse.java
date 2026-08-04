package com.ssafy.ssabway.domain.consultation.dto.response;

import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;

public record ConsultationAcceptResponse(
        Long consultationId,
        String sessionId,
        String token,
        ConsultationStatus status
) {
}