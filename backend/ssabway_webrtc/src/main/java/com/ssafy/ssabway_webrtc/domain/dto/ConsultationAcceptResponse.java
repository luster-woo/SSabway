package com.ssafy.ssabway_webrtc.domain.dto;

import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;


 // 역무원이 상담을 수락한 후 화상 연결에 필요한 정보를 반환
 // 프론트는 전달받은 token을 OpenVidu 클라이언트에 사용하여
 // 역무원 참여자로 해당 상담 세션에 연결.

@Getter
@AllArgsConstructor
public class ConsultationAcceptResponse {

    private Long consultationId;

    private String sessionId;

    private String token;

    private ConsultationStatus status;
}
