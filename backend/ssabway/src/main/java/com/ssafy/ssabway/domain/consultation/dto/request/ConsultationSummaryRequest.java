package com.ssafy.ssabway.domain.consultation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

// 상담 종료 후 프론트가 메모리에 보관한 전체 자막을 전달.
// 서버는 요약만 저장하며 이 자막 목록은 저장하지 않음.
public record ConsultationSummaryRequest(

        @NotEmpty(message = "요약할 상담 자막이 필요합니다.")
        @Size(
                max = 200,
                message = "자막은 최대 200개까지 전달할 수 있습니다."
        )
        List<@Valid TranscriptItem> transcripts
) {
}