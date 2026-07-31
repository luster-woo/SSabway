package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationCancelService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationCancelService consultationCancelService;

    @PostMapping("/{consultationId}/cancel")
    public ApiResponse<ConsultationCancelResponse> cancelConsultation (
        @PathVariable Long consultationId) {
        return ApiResponse.ok(consultationCancelService.cancelConsultation(
                consultationId)
        );
    }
    
}
