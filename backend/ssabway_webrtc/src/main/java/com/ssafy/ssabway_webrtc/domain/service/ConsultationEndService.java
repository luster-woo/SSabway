package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.domain.dto.ConsultationEndResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConsultationEndService {
    private static final String SESSION_PREFIX = "consultation-";

    private final OpenViduService openViduService;

    private final ConsultationRepository consultationRepository;

    public ConsultationEndResponse endConsultation(
        String sessionId
    ) throws OpenViduJavaClientException,
        OpenViduHttpException {

        Long consultationId = extractConsultationId(sessionId);

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(
                () -> new IllegalStateException(
                    "상담 정보를 찾을 수 없습니다."
                )
            );

        // 이미 종료된 상담에 대한 재요청은 성공으로 처리합니다.
        if ("ENDED".equals(consultation.getStatus())) {
            return new ConsultationEndResponse(sessionId, consultation.getRecordId(), true);
        }

        if (!"IN_PROGRESS".equals(consultation.getStatus())) {
            throw new IllegalStateException("진행 중인 상담이 아닙니다.");
        }

        String recordId = consultation.getRecordId();

        if (recordId == null || recordId.isBlank()) {
            throw new IllegalStateException("상담 녹음 정보를 찾을 수 없습니다.");
        }

        Recording recording = openViduService.getRecording(recordId);

        if (!sessionId.equals(recording.getSessionId())) {
            throw new IllegalStateException("상담 세션과 녹음 정보가 일치하지 않습니다.");
        }

        // 진행 중인 녹음을 먼저 종료한 뒤 OpenVidu 세션을 종료합니다.
        if (recording.getStatus() == Recording.Status.started) {
            openViduService.stopAudioRecording(recordId);
        } else if (
            recording.getStatus() != Recording.Status.stopped &&
                recording.getStatus() != Recording.Status.ready
        ) {
            throw new IllegalStateException(
                "현재 상태에서는 녹음을 종료할 수 없습니다."
            );
        }

        openViduService.closeSessionIfActive(sessionId);

        int updatedCount = consultationRepository.endConsultation(consultationId);

        if (updatedCount == 0) {
            throw new IllegalStateException("상담 종료 상태를 저장하지 못했습니다.");
        }

        return new ConsultationEndResponse(sessionId, recordId, true);
    }

    // consultation-{상담 ID} 형식의 세션 ID에서 상담 ID 추출
    private Long extractConsultationId(String sessionId) {
        if(sessionId == null || !sessionId.startsWith(SESSION_PREFIX)){

            throw new IllegalStateException("잘못된 상담 세션 ID입니다.");
        }

        try{
            return Long.parseLong(sessionId.substring(SESSION_PREFIX.length()));
        } catch (NumberFormatException exception){
            throw new IllegalStateException("상담 세션 ID에서 상담 ID를 확인할 수 없습니다.",
                exception
            );
        }
    }

}
