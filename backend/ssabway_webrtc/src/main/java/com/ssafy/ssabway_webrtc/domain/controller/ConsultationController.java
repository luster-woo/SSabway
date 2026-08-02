package com.ssafy.ssabway_webrtc.domain.controller;


import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCreateResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationCancelService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationCancelService consultationCancelService;

    private final ConsultationRequestService consultationRequestService;

    /**
     * 로그인한 사용자의 상담 요청을 WAITING 상태로 등록.
     *
     * 사용자 ID는 요청 Body에서 받지 않고 JWT 인증 필터가
     * SecurityContext에 저장한 principal을 사용.
     *
     * @param authentication JWT 검증 후 생성된 인증 정보
     * @return 생성된 상담 정보와 초기 대기 순번
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ConsultationCreateResponse> requestConsultation(Authentication authentication) {

        Long requesterUserId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(
            consultationRequestService.requestConsultation(requesterUserId));
    }

    @PostMapping("/{consultationId}/cancel")
    public ApiResponse<ConsultationCancelResponse> cancelConsultation (
        @PathVariable Long consultationId) {
        return ApiResponse.ok(consultationCancelService.cancelConsultation(
                consultationId)
        );
    }

}
