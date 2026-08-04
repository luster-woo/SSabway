package com.ssafy.ssabway.domain.consultation.dto.response;

import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import java.time.LocalDateTime;

// 상담 요청이 WAITING 대기열에 등록된 결과입니다.
public record ConsultationCreateResponse(
        Long consultationId,
        ConsultationStatus status,
        long queuePosition,
        String staffName,
        LocalDateTime requestedAt,
        LocalDateTime startedAt
) {
}