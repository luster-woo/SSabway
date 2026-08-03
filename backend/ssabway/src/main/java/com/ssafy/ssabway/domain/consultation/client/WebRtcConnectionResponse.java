package com.ssafy.ssabway.domain.consultation.client;

/**
 * WebRTC 서버가 OpenVidu 세션과 역무원 연결 토큰을 생성한 결과입니다.
 *
 * @param sessionId 생성된 OpenVidu 상담 세션 ID
 * @param token 역무원이 해당 세션에 접속할 때 사용하는 Connection Token
 */
public record WebRtcConnectionResponse(
        String sessionId,
        String token
) {
}