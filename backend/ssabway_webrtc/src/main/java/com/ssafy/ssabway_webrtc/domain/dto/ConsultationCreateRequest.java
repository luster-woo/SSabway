package com.ssafy.ssabway_webrtc.domain.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 상담을 요청하는 역 정보를 전달
@Getter
@NoArgsConstructor
public class ConsultationCreateRequest {

    @NotNull(message = "역무원 번호는 필수입니다.")
    private Long staffId;
}
