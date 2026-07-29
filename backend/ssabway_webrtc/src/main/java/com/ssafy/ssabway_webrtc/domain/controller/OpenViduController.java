package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConnectionCreateRequest;
import com.ssafy.ssabway_webrtc.domain.dto.ConnectionCreateResponse;
import com.ssafy.ssabway_webrtc.domain.dto.SessionCreateRequest;
import com.ssafy.ssabway_webrtc.domain.dto.SessionCreateResponse;
import com.ssafy.ssabway_webrtc.domain.service.OpenViduService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/openvidu")
@RequiredArgsConstructor
public class OpenViduController {

    private final OpenViduService openViduService;

    @PostMapping("/sessions")
    public ApiResponse<SessionCreateResponse> createSession(
        @Valid @RequestBody SessionCreateRequest request
    ) throws OpenViduJavaClientException,
             OpenViduHttpException {

        String sessionId = openViduService.createSession(
            request.getConsultationId()
        );

        return ApiResponse.ok(
            new SessionCreateResponse(sessionId)
        );
    }

    @PostMapping("/sessions/{sessionId}/connections")
    public ApiResponse<ConnectionCreateResponse> createConnection(
        @PathVariable String sessionId,
        @Valid @RequestBody ConnectionCreateRequest request
    ) throws OpenViduJavaClientException,
             OpenViduHttpException {

        String token = openViduService.createConnection(
            sessionId,
            request.getParticipantId(),
            request.getRole()
        );

        return ApiResponse.ok(
            new ConnectionCreateResponse(
                sessionId,
                token
            )
        );
    }
}