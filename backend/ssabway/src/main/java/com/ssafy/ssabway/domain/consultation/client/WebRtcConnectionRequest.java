package com.ssafy.ssabway.domain.consultation.client;

/**
 * 메인 백엔드가 WebRTC 서버에 역무원 연결 생성을 요청할 때 전달하는 정보입니다.
 *
 * @param staffId 상담을 수락한 역무원 ID
 */
public record WebRtcConnectionRequest(
        Long staffId
) {
}