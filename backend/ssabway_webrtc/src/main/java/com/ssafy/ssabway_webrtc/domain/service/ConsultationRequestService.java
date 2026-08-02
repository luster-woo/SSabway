package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationCreateResponse;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import java.util.EnumSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsultationRequestService {

    /**
     * 사용자가 새로운 상담을 요청할 수 없는 활성 상태.
     *
     * 종료되거나 취소된 상담은 새로운 상담 요청을 막지 않음.
     */
    private static final Set<ConsultationStatus>
        ACTIVE_STATUSES = EnumSet.of(
        ConsultationStatus.WAITING,
        ConsultationStatus.MATCHED,
        ConsultationStatus.IN_PROGRESS
    );

    private final ConsultationRepository consultationRepository;

    /**
     * JWT에서 확인한 사용자 ID로 새로운 상담 요청을 생성.
     *
     * 같은 사용자가 이미 대기·매칭·진행 중인 상담을 가지고 있으면
     * 중복 요청을 차단합니다. 요청 Body에서 사용자 ID를 받지 않으므로
     * 다른 사용자 명의로 상담을 생성할 수 없음.
     *
     * @param requesterUserId JWT의 sub에서 추출한 사용자 ID
     * @return 생성된 상담 ID, 상태, 요청 시간 및 초기 대기 순번
     */
    @Transactional
    public ConsultationCreateResponse
    requestConsultation(
        Long requesterUserId
    ) {

        boolean alreadyRequested = consultationRepository
            .existsByRequesterUserIdAndStatusIn(
                    requesterUserId,
                    ACTIVE_STATUSES);

        if (alreadyRequested) { throw new BusinessException(
                ErrorCode.CONSULTATION_DUPLICATED);
        }

        Consultation consultation = Consultation.createWaiting(requesterUserId);

        Consultation savedConsultation = consultationRepository.save(consultation);

        /*
         * 신규 요청은 WAITING 대기열의 마지막에 등록되므로
         * 저장 이후 전체 WAITING 상담 수를 초기 대기 순번으로 반환.
         */
        long queuePosition = consultationRepository.countByStatus(
                ConsultationStatus.WAITING);

        return new ConsultationCreateResponse(
            savedConsultation.getId(),
            savedConsultation.getStatus(),
            queuePosition,
            null,
            savedConsultation.getRequestedAt(),
            null
        );
    }
}
