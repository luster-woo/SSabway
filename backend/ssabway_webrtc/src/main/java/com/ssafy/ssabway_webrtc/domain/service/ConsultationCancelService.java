package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCancelResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConsultationCancelService {

    private final ConsultationRepository consultationRepository;

    public ConsultationCancelResponse cancelConsultation(Long consultationId) {
        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() ->
                new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 이미 취소된 상담에 대한 재요청은 기존 취소 결과를 반환
        if(consultation.getStatus() == ConsultationStatus.CANCELED){
            return new ConsultationCancelResponse(
                consultationId,
                ConsultationStatus.CANCELED
            );
        }

        if(consultation.getStatus() != ConsultationStatus.WAITING){
            throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED);
        }

        // WAITING 상태일 때만 변경해 상담 시작과 취소의 동시 처리를 방지
        int updatedCount = consultationRepository.cancelConsultation(
            consultationId,
            ConsultationStatus.WAITING,
            ConsultationStatus.CANCELED
        );

        if(updatedCount == 0){
            throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_FAILED);
        }

        return new ConsultationCancelResponse(
            consultationId,
            ConsultationStatus.CANCELED
        );

    }
}
