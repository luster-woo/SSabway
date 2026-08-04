package com.ssafy.ssabway_webrtc.domain.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 메인 백엔드가 상담을 수락한 역무원의 OpenVidu 연결 생성을 요청합니다.
 *
 * @param staffId 상담을 수락한 역무원 ID
 */
public record InternalConnectionRequest(
    @NotNull Long staffId
) {
}
