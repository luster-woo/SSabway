package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.domain.dto.ConsultationStartResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
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
            .orElseThrow(() -> new IllegalStateException(
                    "상담 정보를 찾을 수 없습니다."));

        // 이미 녹음이 시작된 상담은 중복으로 녹음을 생성하지 않습니다.
        if ("IN_PROGRESS".equals(consultation.getStatus()) && consultation.getRecordId() != null) {
            return new ConsultationStartResponse(sessionId, true);
        }

        if (!"WAITING".equals(consultation.getStatus())) {
            throw new IllegalStateException("대기 중인 상담만 시작할 수 있습니다.");
        }

        // 양쪽 참여자가 연결된 OpenVidu 세션의 음성 녹음을 시작합니다.
        Recording recording = openViduService.startAudioRecording(sessionId);

        int updatedCount = consultationRepository.startConsultation(
                consultationId,
                recording.getId());

        if (updatedCount == 0) {
            throw new IllegalStateException("상담 시작 상태를 저장하지 못했습니다.");
        }

        return new ConsultationStartResponse(sessionId, true);
    }

    private Long extractConsultationId(String sessionId) {
        if (sessionId == null || !sessionId.startsWith(SESSION_PREFIX)) {
            throw new IllegalStateException("잘못된 상담 세션 ID입니다.");
        }

        try {
            return Long.parseLong(sessionId.substring(SESSION_PREFIX.length()));
        } catch (NumberFormatException exception) {
            throw new IllegalStateException(
                "상담 세션 ID에서 상담 ID를 확인할 수 없습니다.",
                exception
            );
        }
    }
}
