package com.ssafy.ssabway_webrtc.domain.service;

import io.openvidu.java.client.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OpenViduService {

    private static final String USER = "USER";
    private static final String STAFF = "STAFF";

    private final OpenVidu openVidu;
    private final ObjectMapper objectMapper;

    public String createSession(Long consultationId) throws OpenViduJavaClientException, OpenViduHttpException{

        SessionProperties properties = new SessionProperties.Builder()
            .customSessionId("consultation-" + consultationId)
            .build();

        Session session = openVidu.createSession(properties);

        return session.getSessionId();
    }

    public synchronized String createConnection(String sessionId, String participantId, String participantType) throws OpenViduJavaClientException, OpenViduHttpException{

        openVidu.fetch();
        Session session = openVidu.getActiveSession(sessionId);
        if(session == null){
            throw new  IllegalStateException("존재하지 않는 상담 세션");
        }

        // 프론트에서 전달한 역할을 USER 또는 STAFF 형식으로 통일
        String normalizedType = participantType.trim().toUpperCase(Locale.ROOT);

        if (!USER.equals(normalizedType) &&
            !STAFF.equals(normalizedType)) {
            throw new IllegalArgumentException("참여자 역할은 USER 또는 STAFF만 가능합니다.");
        }

        int userCount = 0;
        int staffCount = 0;
        Connection reconnectTarget = null;

        for(Connection existingConnection : session.getConnections()) {

            String existingType = getMetadataValue(existingConnection, "participantType");

            String existingParticipantId = getMetadataValue(existingConnection, "participantId");

            if(existingType == null || existingParticipantId == null){
                throw new IllegalStateException("기존 참여자의 연결 정보를 확인할 수 없습니다.");
            }
            existingType = existingType.toUpperCase(Locale.ROOT);

            // 같은 역할의 동일 참여자는 재접속 대상으로 처리
            if(normalizedType.equals(existingType)){
                if(!participantId.equals(existingParticipantId)){
                    throw new IllegalStateException(normalizedType + " 역할의 참여자가 이미 연결되어 있습니다.");
                }
                reconnectTarget = existingConnection;
                continue;
            }

            // 재접속 대상을 제외한 기존 참여자를 역할별로 계산
            if(USER.equals(existingType)){
                userCount++;
            } else if(STAFF.equals(existingType)){
                staffCount++;
            } else{
                throw new IllegalStateException("알수 없는 참여자 역할입니다.");
            }
        }

        // 새로 발급할 연결까지 역할별 인원에 포함
        if (USER.equals(normalizedType)) {
            userCount++;
        } else {
            staffCount++;
        }

        // USER 1명 또는 STAFF 1명을 초과하면 연결을 거절
        if (userCount > 1 || staffCount > 1) {
            throw new IllegalStateException(
                "화상 상담은 사용자 1명과 역무원 1명만 참여할 수 있습니다."
            );
        }

        // 모든 검증을 통과한 후 기존 재접속 연결을 제거
        if (reconnectTarget != null) {
            session.forceDisconnect(reconnectTarget);
        }


        String connectionData = objectMapper.createObjectNode()
                .put("participantId", participantId)
                .put("participantType", normalizedType)
                .toString();



        ConnectionProperties properties = new ConnectionProperties.Builder()
            .type(ConnectionType.WEBRTC)
            .role(OpenViduRole.PUBLISHER)
            .data(connectionData)
            .build();

        Connection connection = session.createConnection(properties);

        return connection.getToken();
    }

    private String getMetadataValue(Connection connection, String fieldName) {
        String serverData = connection.getServerData();

        if (serverData == null ||
            serverData.isBlank()) {

            return null;
        }

        try{
            JsonNode data = objectMapper.readTree(serverData);

            JsonNode value = data.get(fieldName);

            if(value == null || value.isNull()){
                return null;
            }

            return value.asText();
        } catch (JacksonException exception){
            throw new IllegalStateException("참여자 연결 정보를 읽을 수 없습니다.", exception);
        }
    }

    public void closeSession(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException{
        openVidu.fetch();

        Session session = openVidu.getActiveSession(sessionId);

        if(session == null){
            throw new IllegalStateException("존재하지 않는 상담 세션입니다.");
        }
        session.close();
    }


    // 화면 녹화 후 음성데이터 받아오는 메서드
    public Recording startAudioRecording(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException{
        openVidu.fetch();

        Session session = openVidu.getActiveSession(sessionId);
        if(session == null){
            throw new IllegalStateException("존재하지 않는 상담 세션입니다.");
        }

        RecordingProperties properties = new RecordingProperties.Builder()
            .name("audio-" + sessionId)
            .outputMode(Recording.OutputMode.COMPOSED)
            .hasAudio(true)
            .hasVideo(false)
            .build();

        return openVidu.startRecording(sessionId, properties);
    }

    public Recording stopAudioRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException{
        return openVidu.stopRecording(recordingId);
    }

    // 녹화 ID에 해당하는 현재 녹화 정보를 조회
    public Recording getRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException {
        return openVidu.getRecording(recordingId);
    }

    // 이미 종료된 세션에 재요청이 들어와도 오류 없이 처리
    public boolean closeSessionIfActive(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException{
        openVidu.fetch();

        Session session = openVidu.getActiveSession(sessionId);

        if(session == null){
            return false;
        }
        session.close();

        return true;
    }

}
