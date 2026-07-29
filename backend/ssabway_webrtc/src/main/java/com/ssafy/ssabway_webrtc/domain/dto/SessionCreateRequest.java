package com.ssafy.ssabway_webrtc.domain.dto;


import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SessionCreateRequest {
    @NotNull(message = "상담 ID는 필수입니다.")
    @Positive(message = "상담 ID는 양수여야 합니다.")
    private Long consultationId;
}
