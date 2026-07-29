package com.ssafy.ssabway_webrtc.domain.service;

import io.openvidu.java.client.*;
import io.openvidu.java.client.OpenVidu;
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

    public String createConnection(String sessionId, String participantId, String participantType) throws OpenViduJavaClientException, OpenViduHttpException{

        openVidu.fetch();
        Session session = openVidu.getActiveSession(sessionId);
        if(session == null){
            throw new  IllegalStateException("존재하지 않는 상담 세션");
        }

        ConnectionProperties properties = new ConnectionProperties.Builder()
            .type(ConnectionType.WEBRTC)
            .role(OpenViduRole.PUBLISHER)
            .data("""
                {"participantId":"%s", "participantType":"%s"}
                """.formatted(participantId, participantType))
            .build();

        Connection connection = session.createConnection(properties);

        return connection.getToken();
    }

    public void closeSession(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException{
        openVidu.fetch();

        Session session = openVidu.getActiveSession(sessionId);

        if(session == null){
            throw new IllegalStateException(
                "존재하지 않는 상담 세션입니다."
            );
        }
        session.close();
    }
}
