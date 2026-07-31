package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.*;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationEndService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationStartService;
import com.ssafy.ssabway_webrtc.domain.service.OpenViduService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/openvidu")
@RequiredArgsConstructor
public class OpenViduController {

    private final OpenViduService openViduService;

    private final ConsultationStartService consultationStartService;

    private final ConsultationEndService consultationEndService;

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

    @PostMapping("/sessions/{sessionId}/start")
    public ApiResponse<ConsultationStartResponse> startConsultation(
        @PathVariable String sessionId
    ) throws OpenViduJavaClientException, OpenViduHttpException{
        return ApiResponse.ok(consultationStartService.startConsultation(sessionId));
    }


    @PostMapping("/sessions/{sessionId}/end")
    public ApiResponse<ConsultationEndResponse> endConsultation(@PathVariable String sessionId)
        throws OpenViduJavaClientException, OpenViduHttpException {

        return  ApiResponse.ok(consultationEndService.endConsultation(sessionId));
    }

}
