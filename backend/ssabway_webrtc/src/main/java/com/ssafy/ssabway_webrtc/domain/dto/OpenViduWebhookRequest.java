package com.ssafy.ssabway_webrtc.domain.dto;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OpenViduWebhookRequest {

    private String event;
    private Long timestamp;
    private String sessionId;
    private String id;
    private String name;
    private Boolean hasAudio;
    private Boolean hasVideo;
    private Long size;
    private Double duration;
    private String status;
    private String reason;

}
