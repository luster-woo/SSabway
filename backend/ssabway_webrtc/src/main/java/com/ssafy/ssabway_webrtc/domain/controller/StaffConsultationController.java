package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationAcceptResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationAcceptService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staffs/consultations")
@RequiredArgsConstructor
public class StaffConsultationController {

    private final ConsultationAcceptService
        consultationAcceptService;

    /**
     * 로그인한 역무원이 대기 중인 상담을 수락
     *
     * 역무원 ID는 요청 Body로 받지 않고 검증된 JWT의
     * principal에서 가져와 다른 역무원 명의의 수락을 방지
     *
     * @param consultationId 수락할 상담 ID
     * @param authentication JWT 검증 후 생성된 역무원 인증 정보
     * @return 배정된 상담과 OpenVidu 연결 정보
     */
    @PostMapping("/{consultationId}/accept")
    public ApiResponse<ConsultationAcceptResponse>
    acceptConsultation(
        @PathVariable Long consultationId,
        Authentication authentication
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        Long staffId = (Long) authentication.getPrincipal();

        return ApiResponse.ok(consultationAcceptService
                .acceptConsultation(
                    consultationId,
                    staffId
                )
        );
    }
}
