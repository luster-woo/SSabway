package com.ssafy.ssabway_webrtc.domain.controller;


import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationStatusResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationCancelService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationStatusService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationCancelService consultationCancelService;
    private final ConsultationStatusService consultationStatusService;




    @PostMapping("/{consultationId}/cancel")
    public ApiResponse<ConsultationCancelResponse> cancelConsultation (
        @PathVariable Long consultationId, Authentication authentication)
        throws OpenViduJavaClientException, OpenViduHttpException {

        Long requesterUserId = (Long) authentication.getPrincipal();

        return ApiResponse.ok(consultationCancelService.cancelConsultation(
                consultationId, requesterUserId)
        );
    }

    // 로그인한 사용자가 자신의 상담 상태와 대기 순번을 조회.

    // 사용자 ID는 요청 값으로 받지 않고 검증된 JWT의 principal을 사용하여 상담 소유자를 확인.
    @GetMapping("/{consultationId}")
    public ApiResponse<ConsultationStatusResponse>
    getConsultationStatus(@PathVariable Long consultationId,
        Authentication authentication) {
        Long requesterUserId = (Long) authentication.getPrincipal();

        return ApiResponse.ok(
            consultationStatusService.getStatus(
                consultationId,
                requesterUserId
            )
        );
    }



}
