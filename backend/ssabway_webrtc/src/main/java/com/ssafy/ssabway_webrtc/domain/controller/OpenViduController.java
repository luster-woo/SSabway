package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.*;
import com.ssafy.ssabway_webrtc.domain.service.OpenViduService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<SessionCloseResponse> closeSession(
        @PathVariable String sessionId
    ) throws OpenViduJavaClientException, OpenViduHttpException{
        openViduService.closeSession(sessionId);

        return ApiResponse.ok(
            new SessionCloseResponse(
                sessionId,
                true
            )
        );
    }


    @PostMapping("/sessions/{sessionId}/recordings")
    public ApiResponse<AudioRecordingStartResponse> startAudioRecording(
        @PathVariable String sessionId
    ) throws OpenViduJavaClientException, OpenViduHttpException{

        Recording recording = openViduService.startAudioRecording(sessionId);

        return ApiResponse.ok(
            new AudioRecordingStartResponse(
                recording.getId(),
                recording.getSessionId(),
                recording.getStatus().name()
            )
        );
    }


    @DeleteMapping("/recordings/{recordingId}")
    public ApiResponse<AudioRecordingStopResponse> stopAudioRecording(
        @PathVariable String recordingId
    ) throws OpenViduJavaClientException, OpenViduHttpException{

        Recording recording = openViduService.stopAudioRecording(recordingId);

        return ApiResponse.ok(
            new AudioRecordingStopResponse(
                recording.getId(),
                recording.getSessionId(),
                recording.getStatus().name()
            )
        );
    }

}
