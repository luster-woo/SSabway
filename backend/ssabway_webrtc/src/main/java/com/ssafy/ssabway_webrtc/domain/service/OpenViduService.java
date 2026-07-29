package com.ssafy.ssabway_webrtc.domain.service;

import io.openvidu.java.client.*;
import io.openvidu.java.client.OpenVidu;
>>>>>>> backend/ssabway_webrtc/src/main/java/com/ssafy/ssabway_webrtc/domain/service/OpenViduService.java
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OpenViduService {
    private final OpenVidu openVidu;

    public String createSession(Long consultationId) throws OpenViduJavaClientException, OpenViduHttpException{

        SessionProperties properties = new SessionProperties.Builder()
            .customSessionId("consultation-" + consultationId)
            .build();

        Session session = openVidu.createSession(properties);

        return session.getSessionId();
    }

}
