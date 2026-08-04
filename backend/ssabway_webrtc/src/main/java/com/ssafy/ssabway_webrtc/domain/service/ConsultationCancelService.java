package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsultationCancelService {

    private static final String SESSION_PREFIX = "consultation-";

    private final ConsultationRepository consultationRepository;
    private final OpenViduService openViduService;


    @Transactional(rollbackFor = Exception.class)
    public ConsultationCancelResponse cancelConsultation(Long consultationId, Long requesterUserId)
        throws OpenViduJavaClientException, OpenViduHttpException {

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() ->
                new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 다른 사용자의 상담 요청을 취소하지 못하도록 검증
        if (!consultation.getRequesterUserId()
            .equals(requesterUserId)) {

            throw new BusinessException(
                ErrorCode.CONSULTATION_ACCESS_DENIED
            );
        }

        // 이미 취소된 상담에 대한 재요청은 기존 취소 결과를 반환
        if(consultation.getStatus() == ConsultationStatus.CANCELED){
            return new ConsultationCancelResponse(
                consultationId,
                ConsultationStatus.CANCELED
            );
        }

        ConsultationStatus currentStatus = consultation.getStatus();

        /*
         * 대기 중이거나 수락 직후인 상담만 취소할 수 있음
         * 진행 중인 상담은 녹음 종료가 필요하므로 상담 종료 API를 사용
         */
        if (currentStatus != ConsultationStatus.WAITING &&
            currentStatus != ConsultationStatus.MATCHED) {

            throw new BusinessException(
                ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED
            );
        }

        // WAITING 상태일 때만 변경해 상담 시작과 취소의 동시 처리를 방지
        int updatedCount = consultationRepository.cancelConsultation(
            consultationId,
            currentStatus,
            ConsultationStatus.CANCELED
        );

        if(updatedCount == 0){
            throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_FAILED);
        }

        /*
         * MATCHED 상태는 OpenVidu 세션이 이미 생성되어 있으므로
         * DB 취소 처리와 함께 활성 세션도 종료.
         */
        if (currentStatus == ConsultationStatus.MATCHED) {
            String sessionId =
                SESSION_PREFIX + consultationId;

            openViduService.closeSessionIfActive(
                sessionId
            );
        }


        return new ConsultationCancelResponse(
            consultationId,
            ConsultationStatus.CANCELED
        );

    }
}
