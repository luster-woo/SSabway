package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationStartResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConsultationStartService {

    private static final String SESSION_PREFIX = "consultation-";

    private final OpenViduService openViduService;
    private final ConsultationRepository consultationRepository;

    public ConsultationStartResponse startConsultation(String sessionId) throws OpenViduJavaClientException,
        OpenViduHttpException {

        Long consultationId = extractConsultationId(sessionId);

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() ->
                new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 이미 녹음이 시작된 상담은 중복으로 녹음을 생성하지 않습니다.
        if (consultation.getStatus() == ConsultationStatus.IN_PROGRESS && consultation.getRecordId() != null) {
            return new ConsultationStartResponse(sessionId, ConsultationStatus.IN_PROGRESS);
        }

        if (consultation.getStatus() != ConsultationStatus.WAITING) {
            throw new BusinessException(ErrorCode.CONSULTATION_NOT_WAITING);
        }

        // 양쪽 참여자가 연결된 OpenVidu 세션의 음성 녹음을 시작합니다.
        Recording recording = openViduService.startAudioRecording(sessionId);

        int updatedCount = consultationRepository.startConsultation(
                consultationId,
                recording.getId(),
                ConsultationStatus.WAITING,
                ConsultationStatus.IN_PROGRESS);

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_START_FAILED);
        }

        return new ConsultationStartResponse(sessionId, ConsultationStatus.IN_PROGRESS);
    }

    private Long extractConsultationId(String sessionId) {
        if (sessionId == null || !sessionId.startsWith(SESSION_PREFIX)) {
            throw new BusinessException(ErrorCode.INVALID_SESSION_ID);
        }

        try {
            return Long.parseLong(sessionId.substring(SESSION_PREFIX.length()));
        } catch (NumberFormatException exception) {
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }
}
