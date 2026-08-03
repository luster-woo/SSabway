package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.InternalConnectionRequest;
import com.ssafy.ssabway_webrtc.domain.dto.InternalConnectionResponse;
import com.ssafy.ssabway_webrtc.domain.service.InternalOpenViduService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/v1/openvidu/consultations")
@RequiredArgsConstructor
public class InternalOpenViduController {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final InternalOpenViduService internalOpenViduService;

    @Value("${INTERNAL_API_SECRET}")
    private String internalSecret;

    // 인증된 메인 백엔드 요청에만 OpenVidu 세션과 STAFF 토큰을 발급.
    @PostMapping("/{consultationId}/staff-connection")
    public InternalConnectionResponse createStaffConnection(
        @PathVariable Long consultationId,
        @RequestHeader(INTERNAL_SECRET_HEADER)
        String requestSecret,
        @Valid @RequestBody
        InternalConnectionRequest request
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        if (!internalSecret.equals(requestSecret)) {
            throw new BusinessException(ErrorCode.INVALID_INTERNAL_SECRET);
        }

        return internalOpenViduService.createStaffConnection(
                consultationId,
                request.staffId()
            );
    }
}
