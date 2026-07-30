package com.ssafy.ssabway_webrtc.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConsultationEndResponse {
    private String sessionId;
    private String recordingId;
    private boolean ended;
}
