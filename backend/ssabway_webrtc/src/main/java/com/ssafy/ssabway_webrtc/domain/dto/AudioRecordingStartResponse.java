package com.ssafy.ssabway_webrtc.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AudioRecordingStartResponse {
    private String recordingId;
    private String sessionId;
    private String status;
}
