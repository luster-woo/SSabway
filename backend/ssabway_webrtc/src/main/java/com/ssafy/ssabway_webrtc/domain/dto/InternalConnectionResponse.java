package com.ssafy.ssabway_webrtc.domain.dto;

/**
 * 생성된 OpenVidu 세션과 역무원 접속 토큰을 메인 백엔드에 반환합니다.
 *
 * @param sessionId OpenVidu 상담 세션 ID
 * @param token 역무원 Connection Token
 */
public record InternalConnectionResponse(
    String sessionId,
    String token
) {
}
