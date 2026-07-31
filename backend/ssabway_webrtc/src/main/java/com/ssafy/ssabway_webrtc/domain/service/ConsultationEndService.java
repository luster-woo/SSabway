package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationEndResponse;
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
                () -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND)
            );

        // 이미 종료된 상담에 대한 재요청은 성공으로 처리합니다.
        if (consultation.getStatus() == ConsultationStatus.ENDED) {
            return new ConsultationEndResponse(sessionId, consultation.getRecordId(), ConsultationStatus.ENDED);
        }

        if (consultation.getStatus() != ConsultationStatus.IN_PROGRESS) {
            throw new BusinessException(ErrorCode.CONSULTATION_NOT_IN_PROGRESS);
        }

        String recordId = consultation.getRecordId();

        if (recordId == null || recordId.isBlank()) {
            throw new BusinessException(ErrorCode.RECORDING_NOT_FOUND);
        }

        Recording recording = openViduService.getRecording(recordId);

        if (!sessionId.equals(recording.getSessionId())) {
            throw new BusinessException(ErrorCode.SESSION_RECORDING_MISMATCH);
        }

        // 진행 중인 녹음을 먼저 종료한 뒤 OpenVidu 세션을 종료합니다.
        if (recording.getStatus() == Recording.Status.started) {
            openViduService.stopAudioRecording(recordId);
        } else if (
            recording.getStatus() != Recording.Status.stopped &&
                recording.getStatus() != Recording.Status.ready
        ) {
            throw new BusinessException(ErrorCode.RECORDING_STATUS_INVALID);
        }

        openViduService.closeSessionIfActive(sessionId);

        int updatedCount = consultationRepository.endConsultation(consultationId, ConsultationStatus.IN_PROGRESS,
            ConsultationStatus.ENDED);

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_END_FAILED);
        }

        return new ConsultationEndResponse(sessionId, recordId, ConsultationStatus.ENDED);
    }

    // consultation-{상담 ID} 형식의 세션 ID에서 상담 ID 추출
    private Long extractConsultationId(String sessionId) {
        if(sessionId == null || !sessionId.startsWith(SESSION_PREFIX)){

            throw new BusinessException(ErrorCode.INVALID_SESSION_ID);
        }

        try{
            return Long.parseLong(sessionId.substring(SESSION_PREFIX.length()));
        } catch (NumberFormatException exception){
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }

}
