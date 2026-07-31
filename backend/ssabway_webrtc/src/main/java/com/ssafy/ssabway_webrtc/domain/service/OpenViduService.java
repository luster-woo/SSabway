package com.ssafy.ssabway_webrtc.domain.service;

import io.openvidu.java.client.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;
import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;

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
            throw new BusinessException(ErrorCode.OPENVIDU_SESSION_NOT_FOUND);
        }

        // 프론트에서 전달한 역할을 USER 또는 STAFF 형식으로 통일
        String normalizedType = participantType.trim().toUpperCase(Locale.ROOT);

        if (!USER.equals(normalizedType) &&
            !STAFF.equals(normalizedType)) {
            throw new BusinessException(ErrorCode.INVALID_PARTICIPANT_ROLE);
        }

        int userCount = 0;
        int staffCount = 0;
        Connection reconnectTarget = null;

        for(Connection existingConnection : session.getConnections()) {

            String existingType = getMetadataValue(existingConnection, "participantType");

            String existingParticipantId = getMetadataValue(existingConnection, "participantId");

            if(existingType == null || existingParticipantId == null){
                throw new BusinessException(ErrorCode.CONNECTION_METADATA_INVALID);
            }
            existingType = existingType.toUpperCase(Locale.ROOT);

            // 같은 역할의 동일 참여자는 재접속 대상으로 처리
            if(normalizedType.equals(existingType)){
                if(!participantId.equals(existingParticipantId)){
                    throw new BusinessException(ErrorCode.PARTICIPANT_ALREADY_CONNECTED);
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
                throw new BusinessException(ErrorCode.CONNECTION_METADATA_INVALID);
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
            throw new BusinessException(ErrorCode.PARTICIPANT_LIMIT_EXCEEDED);
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
            throw new BusinessException(
                ErrorCode.CONNECTION_METADATA_INVALID,
                exception
            );
        }
    }

    // 화면 녹화 후 음성데이터 받아오는 메서드
    public Recording startAudioRecording(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException{
        openVidu.fetch();

        Session session = openVidu.getActiveSession(sessionId);
        if(session == null){
            throw new BusinessException(ErrorCode.OPENVIDU_SESSION_NOT_FOUND);
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
