package com.ssafy.ssabway_webrtc.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AudioRecordingStopResponse {
    private String recordingid;
    private String sessionId;
    private String status;
}
