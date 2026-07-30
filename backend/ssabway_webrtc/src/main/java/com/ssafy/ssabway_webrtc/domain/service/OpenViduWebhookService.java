package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.domain.dto.OpenViduWebhookRequest;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OpenViduWebhookService {
    private final OpenVidu openVidu;

    public void handle(OpenViduWebhookRequest request) {
        if(!"recordingStatusChanged".equals(request.getEvent())){
            return;
        }

        if(!"ready".equalsIgnoreCase(request.getStatus())){
            return;
        }

        if (request.getId() == null || request.getId().isBlank()) {
            throw new IllegalArgumentException("녹화 ID가 없습니다.");
        }

        try {
            Recording recording = openVidu.getRecording(request.getId());
        } catch (OpenViduJavaClientException | OpenViduHttpException exception) {
            throw new IllegalStateException("완료된 녹음 정보를 조회할 수 없습니다.", exception);
        }
    }
}
