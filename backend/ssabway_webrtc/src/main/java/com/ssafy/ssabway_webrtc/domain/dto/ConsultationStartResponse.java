package com.ssafy.ssabway_webrtc.domain.dto;

import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConsultationStartResponse {

    private String sessionId;
    private ConsultationStatus status;

}
