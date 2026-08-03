package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.ConsultationAcceptResponse;
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
public class ConsultationAcceptService {

    private final ConsultationRepository consultationRepository;

    private final OpenViduService openViduService;

    /**
     * 역무원이 대기 중인 상담을 수락하고 화상 연결 토큰을 발급.
     *
     * DB 상태 변경과 OpenVidu 처리를 하나의 작업으로 묶으며,
     * 여러 역무원이 동시에 수락하면 DB 조건부 UPDATE에 성공한
     * 한 명의 역무원에게만 상담이 배정
     *
     * OpenVidu 세션 또는 토큰 생성에 실패하면 예외를 전달하여
     * DB의 상담 배정 작업도 롤백
     *
     * @param consultationId 역무원이 수락하려는 상담 ID
     * @param staffId JWT에서 확인한 역무원 ID
     * @return 상담 ID, 세션 ID, 역무원 연결 토큰 및 MATCHED 상태
     */
    @Transactional(rollbackFor = Exception.class)
    public ConsultationAcceptResponse acceptConsultation(
        Long consultationId,
        Long staffId
    ) throws OpenViduJavaClientException,
        OpenViduHttpException {

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() ->
                new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND)
            );

        if (consultation.getStatus() != ConsultationStatus.WAITING) {

            throw new BusinessException(ErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }
        if (!consultation.getStaffId().equals(staffId)) {
            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }


        // 상담 ID와 현재 상태를 조건으로 직접 UPDATE.
        //동시에 여러 요청이 들어와도 실제 UPDATE는 한 건만 성공
        int updatedCount =
            consultationRepository.acceptConsultation(
                staffId,
                consultationId,
                ConsultationStatus.WAITING,
                ConsultationStatus.MATCHED
            );

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }

        String sessionId = null;

        try {

            // 상담 ID로 고정된 OpenVidu 세션을 생성
            // 생성되는 세션 ID는 consultation-{consultationId} 형식

            sessionId =
                openViduService.createSession(consultationId);


            // 수락한 역무원이 바로 화상방에 입장할 수 있도록
            // STAFF 역할의 OpenVidu 연결 토큰을 발급

            String token =
                openViduService.createConnection(
                    sessionId,
                    staffId.toString(),
                    "STAFF"
                );

            return new ConsultationAcceptResponse(
                consultationId,
                sessionId,
                token,
                ConsultationStatus.MATCHED
            );

        } catch (OpenViduJavaClientException | OpenViduHttpException exception) {
            /*
             * 세션 생성 이후 토큰 발급에 실패한 경우,
             * 사용되지 않는 OpenVidu 세션이 남지 않도록 정리
             *
             * 원래 발생한 예외가 가려지지 않도록 세션 정리 실패는
             * 여기서 별도의 예외로 변경하지 않음
             */
            closeCreatedSessionQuietly(sessionId);

            throw exception;
        } catch (RuntimeException exception) {
            closeCreatedSessionQuietly(
                sessionId
            );

            throw exception;
        }
    }


    // 상담 수락 처리 중 생성된 OpenVidu 세션을 안전하게 정리

    private void closeCreatedSessionQuietly(
        String sessionId
    ) {
        if (sessionId == null) {
            return;
        }

        try {
            openViduService.closeSessionIfActive(
                sessionId
            );
        } catch (
            OpenViduJavaClientException |
            OpenViduHttpException ignored
        ) {
            // 원래 발생한 세션·토큰 생성 오류를 그대로 전달
        }
    }
}
