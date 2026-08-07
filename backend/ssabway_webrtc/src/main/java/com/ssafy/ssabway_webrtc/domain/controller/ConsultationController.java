package com.ssafy.ssabway_webrtc.domain.controller;


import com.ssafy.ssabway_webrtc.domain.dto.ConsultationLeaveResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationLeaveService;
import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationStatusResponse;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationCancelService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationStaffCancelService;
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
    private final ConsultationLeaveService consultationLeaveService;
    private final ConsultationStaffCancelService consultationStaffCancelService;




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

    /**
     * 사용자가 상담 화면에서 먼저 나갈 때 상담 상태와
     * OpenVidu 녹음 및 세션을 함께 정리
     */
    @PostMapping("/{consultationId}/leave")
    public ApiResponse<ConsultationLeaveResponse>
    leaveConsultation(
        @PathVariable Long consultationId,
        Authentication authentication
    ) throws OpenViduJavaClientException,
        OpenViduHttpException {

        Long requesterUserId =
            (Long) authentication.getPrincipal();

        return ApiResponse.ok(
            consultationLeaveService
                .leaveConsultation(
                    consultationId,
                    requesterUserId
                )
        );
    }

    /**
     * 역무원이 담당 상담을 취소.
     *
     * 마이크 권한을 얻지 못한 역무원은 상담을 진행할 수 없는데, 상담을 요청한
     * 역에는 역무원 계정이 하나뿐이라 다른 역무원에게 넘길 수도 없습니다.
     * 그래서 수락 전(WAITING)이든 수락 직후(MATCHED)든 상담을 취소합니다.
     *
     * 같은 URL 트리의 다른 API와 달리 STAFF 토큰으로 호출합니다.
     * SecurityConfig가 이 경로만 USER 전용 규칙에서 빼 두었고,
     * 담당 역무원 본인인지는 서비스가 staff_id로 다시 검증합니다.
     */
    @PostMapping("/{consultationId}/staff-cancel")
    public ApiResponse<ConsultationCancelResponse> cancelConsultationByStaff(
        @PathVariable Long consultationId,
        Authentication authentication
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        Long staffId = (Long) authentication.getPrincipal();

        return ApiResponse.ok(
            consultationStaffCancelService.cancelByStaff(
                consultationId,
                staffId
            )
        );
    }

}
