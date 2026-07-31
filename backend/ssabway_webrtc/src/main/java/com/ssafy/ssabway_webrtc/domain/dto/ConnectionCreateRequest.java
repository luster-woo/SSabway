package com.ssafy.ssabway_webrtc.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConnectionCreateRequest {

    @NotBlank(message = "참여자 ID는 필수입니다.")
    private String participantId;

    @NotBlank(message = "참여자 역할은 필수입니다.")
    @Pattern(
        regexp = "(?i)USER|STAFF",
        message = "참여자 역할은 USER 또는 STAFF만 가능합니다."
    )
    private String role;
}
