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

/**
 * 역무원이 상담을 취소.
 *
 * 사용자용 취소(ConsultationCancelService)와 나뉘는 이유는 인가 대상뿐입니다.
 * 그쪽은 requesterUserId를, 이쪽은 staffId를 대조합니다.
 *
 * 역무원의 마이크 권한 거부가 이 API의 유일한 호출 사유입니다.
 * 상담을 요청한 역에는 역무원 계정이 하나뿐이라 다른 역무원이 대신 받을 수
 * 없으므로, 마이크가 없으면 상담 자체를 취소해야 사용자가 대기에서 풀립니다.
 */
@Service
@RequiredArgsConstructor
public class ConsultationStaffCancelService {

    private static final String SESSION_PREFIX = "consultation-";

    private final ConsultationRepository consultationRepository;
    private final OpenViduService openViduService;

    /**
     * @param consultationId 취소할 상담 ID
     * @param staffId JWT에서 확인한 역무원 ID
     */
    @Transactional(rollbackFor = Exception.class)
    public ConsultationCancelResponse cancelByStaff(
        Long consultationId,
        Long staffId
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        /*
         * 상담 시작(MATCHED → IN_PROGRESS)과 동시에 처리되지 않도록 행을 잠급니다.
         * 아래 조건부 UPDATE가 2차 방어로 남습니다.
         */
        Consultation consultation = consultationRepository
            .findByIdForUpdate(consultationId)
            .orElseThrow(() ->
                new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        /*
         * staff_id는 상담 생성 시점에 출발역 담당 역무원으로 채워지므로
         * WAITING 구간에도 값이 있습니다. 상태와 무관하게 대조할 수 있습니다.
         */
        if (!consultation.getStaffId().equals(staffId)) {
            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }

        ConsultationStatus currentStatus = consultation.getStatus();

        // 이미 취소된 상담에 대한 재요청은 기존 취소 결과를 반환
        if (currentStatus == ConsultationStatus.CANCELED) {
            return new ConsultationCancelResponse(
                consultationId,
                ConsultationStatus.CANCELED
            );
        }

        /*
         * 수락 전(WAITING)과 수락 직후(MATCHED)만 취소할 수 있습니다.
         * 녹음이 시작된 상담은 녹음 정지가 필요하므로 상담 종료 API를 사용합니다.
         */
        if (currentStatus != ConsultationStatus.WAITING &&
            currentStatus != ConsultationStatus.MATCHED) {

            throw new BusinessException(
                ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED
            );
        }

        int updatedCount = consultationRepository.cancelConsultation(
            consultationId,
            currentStatus,
            ConsultationStatus.CANCELED
        );

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_FAILED);
        }

        /*
         * MATCHED는 수락(accept) 시점에 OpenVidu 세션이 이미 만들어져 있으므로
         * DB 취소와 함께 활성 세션도 닫습니다. WAITING은 세션이 없어 정리할 것이
         * 없습니다(closeSessionIfActive는 없으면 false를 돌려줄 뿐이지만,
         * 불필요한 OpenVidu 왕복을 피합니다).
         */
        if (currentStatus == ConsultationStatus.MATCHED) {
            openViduService.closeSessionIfActive(
                SESSION_PREFIX + consultationId
            );
        }

        return new ConsultationCancelResponse(
            consultationId,
            ConsultationStatus.CANCELED
        );
    }
}
