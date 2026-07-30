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

    public ConsultationEndResponse endConsultation(String sessionId, String recordingId) throws OpenViduJavaClientException, OpenViduHttpException {

        Long consultationId = extractConsultationId(sessionId);

        // 전달받은 녹화 ID가 현재 상담 세션의 녹화인지 확인
        Recording recording = openViduService.getRecording(recordingId);

        if(!sessionId.equals(recording.getSessionId())){
            throw new IllegalStateException("상담 세션과 녹화 정보가 일치하지 않습니다.");
        }

        if(recording.getStatus() == Recording.Status.started){
            openViduService.stopAudioRecording(recordingId);
        } else if(recording.getStatus() != Recording.Status.stopped &&
            recording.getStatus() != Recording.Status.ready) {
            throw new IllegalStateException("현재 상태에서는 녹화를 종료할 수 없습니다.");
        }

        // 활성 세션이 존재할 때만 종료해 중복 요청을 허용
        openViduService.closeSessionIfActive(sessionId);

        // 진행 중인 상담만 ENDED로 변경
        int updatedCount = consultationRepository.endConsultation(consultationId);

        if(updatedCount == 0){
            Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(
                    () -> new IllegalStateException("상담 정보를 찾을 수 없습니다."
                    )
                );

            // 이미 종료된 상담에 대한 재요청은 성공으로 처리
            if(!"ENDED".equals(consultation.getStatus())){
                throw new IllegalStateException("진행 중인 상담이 아닙니다.");
            }

        }

        return new ConsultationEndResponse(
            sessionId,
            recordingId,
            true
        );
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
