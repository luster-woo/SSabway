package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationStatusResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsultationStatusService {

    private static final String SESSION_PREFIX = "consultation-";

    private final ConsultationRepository consultationRepository;

    /**
     * 로그인한 사용자가 요청한 상담의 현재 상태를 조회.
     *
     * JWT 사용자 ID와 상담 요청자 ID를 비교하여 다른 사용자의
     * 상담 정보를 조회하지 못하도록 차단.
     *
     * WAITING 상태이면 현재 대기 순번을 계산하고,
     * MATCHED 또는 IN_PROGRESS이면 화상 연결용 세션 ID를 반환.
     *
     * @param consultationId 조회할 상담 ID
     * @param requesterUserId JWT에서 확인한 사용자 ID
     * @return 상담 상태, 대기 순번 또는 OpenVidu 세션 ID
     */
    @Transactional(readOnly = true)
    public ConsultationStatusResponse getStatus(
        Long consultationId,
        Long requesterUserId
    ) {
        Consultation consultation = consultationRepository
                .findById(consultationId)
                .orElseThrow(() ->
                    new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        validateOwner(consultation, requesterUserId);

        Long queuePosition = calculateQueuePosition(consultation);

        String sessionId = createSessionIdIfConnected(consultation);

        return new ConsultationStatusResponse(
            consultation.getId(),
            consultation.getStatus(),
            queuePosition,
            sessionId,
            consultation.getRequestedAt(),
            consultation.getStartedAt()
        );
    }

    // JWT 사용자와 실제 상담 요청자가 같은지 확인
    private void validateOwner(Consultation consultation, Long requesterUserId) {
        if (!consultation
            .getRequesterUserId()
            .equals(requesterUserId)) {

            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }
    }

    // 대기 중인 상담에만 현재 대기 순번을 반환
    private Long calculateQueuePosition(
        Consultation consultation
    ) {
        if (consultation.getStatus() != ConsultationStatus.WAITING) {

            return null;
        }

        return consultationRepository
            .calculateQueuePosition(
                ConsultationStatus.WAITING,
                consultation.getRequestedAt(),
                consultation.getId()
            );
    }

    /**
     * 역무원이 배정된 상담에만 OpenVidu 세션 ID를 반환
     *
     * 종료되거나 취소된 상담에는 다시 접속할 수 없도록
     * 세션 ID를 반환하지 않음.
     */
    private String createSessionIdIfConnected(
        Consultation consultation
    ) {
        ConsultationStatus status = consultation.getStatus();

        if (status == ConsultationStatus.MATCHED || status == ConsultationStatus.IN_PROGRESS) {
            return SESSION_PREFIX + consultation.getId();
        }

        return null;
    }
}
