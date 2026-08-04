package com.ssafy.ssabway.domain.consultation.dto.response;

// GMS로 생성해 상담 테이블에 저장한 최종 요약 결과
public record ConsultationSummaryResponse(
        Long consultationId,
        String summary
) {
}