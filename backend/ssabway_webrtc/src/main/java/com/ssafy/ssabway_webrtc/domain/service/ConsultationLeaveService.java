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

/**
 * 사용자가 상담 화면에서 먼저 나갈 때의 정리.
 *
 * 상태를 보고 취소(WAITING·MATCHED)와 종료(IN_PROGRESS)를 가릅니다.
 *
 * ⚠️ 이 클래스에 @Transactional을 붙이지 마세요.
 *
 * 예전에는 여기서 findByIdForUpdate로 행을 잠근 채 아래 서비스들을 호출해,
 * 종료 쪽 트랜잭션을 짧게 쪼개 놓아도 바깥 트랜잭션이 잠금을 그대로 붙들고
 * 있었습니다. 그러면 녹음 완료 웹훅의 record_s3 UPDATE가 막혀 녹취 경로가
 * 유실됩니다. (ConsultationEndStateService 주석 참고)
 *
 * 잠금 없이 읽어도 안전한 이유는 아래 두 서비스가 각각 조건부 UPDATE로
 * 자기 전이를 원자적으로 처리하기 때문입니다 — 상태를 놓치면 전이가 0건이
 * 되어 실패로 드러나지, 잘못된 전이가 일어나지는 않습니다.
 */
@Service
@RequiredArgsConstructor
public class ConsultationLeaveService {

    private static final String SESSION_PREFIX = "consultation-";

    /**
     * 상태를 읽은 뒤 전이 사이에 다른 요청이 끼어든 경우를 위한 재시도 횟수.
     *
     * 실제로 겹칠 수 있는 구간은 하나뿐입니다 — MATCHED로 읽고 취소를
     * 시도하는 사이에 역무원 쪽 start가 IN_PROGRESS로 올려버리는 경우.
     * 그때는 취소가 0건으로 실패하므로 다시 읽어 종료 경로로 넘어갑니다.
     */
    private static final int MAX_ATTEMPTS = 2;

    private final ConsultationRepository consultationRepository;
    private final ConsultationCancelService consultationCancelService;
    private final ConsultationEndService consultationEndService;

    public ConsultationLeaveResponse leaveConsultation(
        Long consultationId, Long requesterUserId
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        BusinessException lastFailure = null;

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                return leaveOnce(consultationId, requesterUserId);
            } catch (BusinessException exception) {
                if (!isStaleStateFailure(exception)) {
                    throw exception;
                }
                // 상태가 그사이 바뀌었다. 다시 읽어 알맞은 경로로 간다.
                lastFailure = exception;
            }
        }

        throw lastFailure;
    }

    private ConsultationLeaveResponse leaveOnce(
        Long consultationId, Long requesterUserId
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        Consultation consultation = consultationRepository
            .findById(consultationId)
            .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 로그인 사용자가 해당 상담을 요청한 사용자인지 확인
        if (!consultation.getRequesterUserId().equals(requesterUserId)) {
            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }

        ConsultationStatus status = consultation.getStatus();

        /*
         * 역무원이 수락하기 전(WAITING)과 수락 직후(MATCHED)는 상담 이력이
         * 아니므로 취소합니다. MATCHED는 세션이 이미 만들어져 있어 취소
         * 서비스가 세션까지 정리합니다.
         */
        if (status == ConsultationStatus.WAITING ||
            status == ConsultationStatus.MATCHED) {

            ConsultationCancelResponse response =
                consultationCancelService.cancelConsultation(
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
        if (status == ConsultationStatus.IN_PROGRESS) {
            String sessionId = SESSION_PREFIX + consultationId;

            ConsultationEndResponse response = consultationEndService
                .endConsultation(sessionId);

            return new ConsultationLeaveResponse(
                consultationId,
                response.getStatus()
            );
        }

        // 중복 요청은 이미 저장된 최종 상태를 그대로 반환
        if (status == ConsultationStatus.CANCELED ||
            status == ConsultationStatus.ENDED) {

            return new ConsultationLeaveResponse(consultationId, status);
        }

        throw new BusinessException(ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED);
    }

    /**
     * 읽은 상태와 실제 상태가 어긋나 전이가 거부된 경우인지.
     *
     * 이 오류들만 다시 시도할 가치가 있습니다 — 권한·미존재처럼 다시 읽어도
     * 결과가 같은 실패까지 재시도하면 원인만 가려집니다.
     */
    private boolean isStaleStateFailure(BusinessException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        return errorCode == ErrorCode.CONSULTATION_CANCEL_FAILED ||
            errorCode == ErrorCode.CONSULTATION_CANCEL_NOT_ALLOWED ||
            errorCode == ErrorCode.CONSULTATION_NOT_IN_PROGRESS;
    }
}
