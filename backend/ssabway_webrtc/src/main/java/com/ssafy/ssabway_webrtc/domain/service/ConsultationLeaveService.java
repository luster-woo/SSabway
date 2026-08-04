package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationEndResponse;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationLeaveResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConsultationLeaveService {

    private static final String SESSION_PREFIX = "consultation-";

    private final ConsultationRepository consultationRepository;
    private final ConsultationCancelService consultationCancelService;
    private final ConsultationEndService consultationEndService;

    public ConsultationLeaveResponse leaveConsultation(
        Long consultationId, Long requesterUserId
    ) throws OpenViduJavaClientException, OpenViduHttpException{

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 로그인 사용자가 해당 상담을 요청한 사용자인지 확인
        if(!consultation.getRequesterUserId().equals(requesterUserId)){
            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }

        ConsultationStatus status = consultation.getStatus();


        /*
         * 대기 중이거나 수락 직후인 상담은 취소 처리하고,
         * MATCHED 상태라면 CancelService가 OpenVidu 세션도 종료
         */

        if(status == ConsultationStatus.WAITING || status == ConsultationStatus.MATCHED){

            ConsultationCancelResponse response = consultationCancelService
                .cancelConsultation(
                    consultationId,
                    requesterUserId
                );


            return new ConsultationLeaveResponse(
                response.getConsultationId(),
                response.getStatus()
            );
        }

        /*
         * 진행 중인 상담은 녹음을 중지하고 세션을 종료한 뒤
         * 상담 상태를 ENDED로 변경
         */

        if(status == ConsultationStatus.IN_PROGRESS){
            String sessionId = SESSION_PREFIX + consultationId;

            ConsultationEndResponse response = consultationEndService
                .endConsultation(sessionId);

            return new ConsultationLeaveResponse(
                consultationId,
                response.getStatus()
            );
        }

        // 중복 요청은 이미 저장된 최종 상태를 그대로 반환
        if(status == ConsultationStatus.CANCELED || status == ConsultationStatus.ENDED){
            return new ConsultationLeaveResponse(
                consultationId,
                status
            );
        }

        throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED);
    }
}
