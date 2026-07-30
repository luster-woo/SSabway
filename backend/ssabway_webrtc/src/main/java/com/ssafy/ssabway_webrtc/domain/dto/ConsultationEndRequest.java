package com.ssafy.ssabway_webrtc.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConsultationEndRequest {
    @NotBlank(message = "녹화 ID는 필수입니다.")
    private String recordingId;
}
