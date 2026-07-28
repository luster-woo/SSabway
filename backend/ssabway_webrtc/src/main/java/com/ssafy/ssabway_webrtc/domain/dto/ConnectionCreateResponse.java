package com.ssafy.ssabway_webrtc.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConnectionCreateResponse {

    private String sessionId;
    private String token;
}
