package com.ssafy.ssabway_webrtc.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConsultationStartResponse {

    private String sessionId;
    private boolean started;

}
