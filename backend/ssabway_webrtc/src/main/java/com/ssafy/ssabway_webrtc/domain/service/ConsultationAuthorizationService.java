package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.common.jwt.TokenType;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConsultationAuthorizationService {

    /*
     * OpenVidu 세션 ID는 consultation-{상담 ID} 형식으로 생성됩니다.
     * 세션 ID에서 상담 ID를 추출해 DB의 상담 참여자 정보를 조회합니다.
     */
    private static final String SESSION_PREFIX =
        "consultation-";

    private final ConsultationRepository
        consultationRepository;

    /**
     * JWT에서 확인한 사용자 정보와 DB에 저장된 상담 참여자를 비교.
     *
     * USER는 해당 상담의 requesterUserId와 일치해야 하며,
     * STAFF는 해당 상담에 배정된 staffId와 일치해야 함.
     *
     * @param sessionId OpenVidu 상담 세션 ID
     * @param participantId JWT의 sub에서 추출한 사용자 또는 역무원 ID
     * @param participantType JWT의 type에서 추출한 USER 또는 STAFF
     */
    public void validateParticipant(
        String sessionId,
        Long participantId,
        TokenType participantType
    ) {
        Long consultationId =
            extractConsultationId(sessionId);

        Consultation consultation =
            consultationRepository
                .findById(consultationId)
                .orElseThrow(() ->
                    new BusinessException(
                        ErrorCode.CONSULTATION_NOT_FOUND
                    )
                );

        /*
         * 프론트 요청값이 아니라 검증이 완료된 JWT의 역할을 사용해
         * 사용자와 역무원의 상담 참여 권한을 각각 확인합니다.
         */
        if (participantType == TokenType.USER) {
            validateUser(
                consultation,
                participantId
            );
            return;
        }

        validateStaff(
            consultation,
            participantId
        );
    }

    /**
     * 로그인한 사용자가 상담을 요청한 본인인지 확인.
     *
     * @param consultation DB에서 조회한 상담
     * @param participantId JWT에서 확인한 사용자 ID
     */
    private void validateUser(
        Consultation consultation,
        Long participantId
    ) {
        if (!participantId.equals(
            consultation.getRequesterUserId()
        )) {
            throw new BusinessException(
                ErrorCode.FORBIDDEN
            );
        }
    }

    /**
     * 로그인한 역무원이 해당 상담에 배정된 역무원인지 확인.
     *
     * 아직 역무원이 배정되지 않아 staffId가 없거나,
     * JWT의 역무원 ID와 DB의 staffId가 다르면 참여를 거부.
     *
     * @param consultation DB에서 조회한 상담
     * @param participantId JWT에서 확인한 역무원 ID
     */
    private void validateStaff(
        Consultation consultation,
        Long participantId
    ) {
        if (consultation.getStaffId() == null ||
            !participantId.equals(
                consultation.getStaffId()
            )) {

            throw new BusinessException(
                ErrorCode.FORBIDDEN
            );
        }
    }

    /**
     * consultation-{상담 ID} 형식의 세션 ID에서 상담 ID를 추출.
     *
     * 형식이 올바르지 않거나 상담 ID 부분이 숫자가 아니면
     * 잘못된 세션 ID 예외를 발생.
     *
     * @param sessionId OpenVidu 상담 세션 ID
     * @return DB 조회에 사용할 상담 ID
     */
    private Long extractConsultationId(
        String sessionId
    ) {
        if (sessionId == null ||
            !sessionId.startsWith(SESSION_PREFIX)) {

            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID
            );
        }

        try {
            return Long.parseLong(
                sessionId.substring(
                    SESSION_PREFIX.length()
                )
            );
        } catch (NumberFormatException exception) {
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }
}
