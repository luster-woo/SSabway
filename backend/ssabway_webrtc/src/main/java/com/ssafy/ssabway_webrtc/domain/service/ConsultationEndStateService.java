package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 상담 종료의 DB 상태 전이만 담당합니다.
 *
 * ConsultationEndService에서 이 부분만 떼어낸 이유는 트랜잭션 경계 때문입니다.
 * 예전에는 하나의 트랜잭션이 행 잠금(findByIdForUpdate)을 잡은 채로 OpenVidu
 * HTTP 호출을 3~4회 수행하고 나서야 커밋했습니다. 그 사이 세션이 닫히면서
 * 녹음 완료(ready) 웹훅이 날아오는데, 웹훅이 저장하려는 record_s3 UPDATE가
 * 같은 행 잠금에 걸려 대기했습니다. OpenVidu 응답이 느린 날에는 대기가
 * 길어져 잠금 타임아웃으로 웹훅이 통째로 실패하고, OpenVidu는 웹훅을
 * 재시도하지 않으므로 S3에는 파일이 있는데 DB에 경로가 없는 상태가 됐습니다.
 *
 * 실측(운영 로그 93번 상담) 기준 잠금 유지 460ms, 웹훅 도착은 세션 종료
 * 650ms 뒤였습니다. 여유가 200ms 남짓이라 언제 뒤집혀도 이상하지 않습니다.
 *
 * 그래서 상태 전이를 짧은 트랜잭션으로 먼저 끝내고 커밋한 다음, OpenVidu
 * 정리는 잠금 없이 수행합니다. 자기 호출(self-invocation)은 프록시를 타지
 * 않아 @Transactional이 무시되므로 클래스를 나눠야 합니다.
 */
@Service
@RequiredArgsConstructor
public class ConsultationEndStateService {

    private static final String SESSION_PREFIX = "consultation-";

    private final ConsultationRepository consultationRepository;

    /**
     * 종료 전이 결과.
     *
     * @param consultationId 상담 ID
     * @param recordId 녹음 ID. 녹음이 시작되지 않았다면 null
     * @param alreadyEnded 이미 종료된 상담이라 이번에 전이하지 않았음
     */
    public record EndTransition(
        Long consultationId,
        String recordId,
        boolean alreadyEnded
    ) {}

    /**
     * IN_PROGRESS 상담을 ENDED로 전이합니다.
     *
     * OpenVidu를 호출하지 않으므로 트랜잭션이 짧게 끝나고 행 잠금도 곧바로
     * 풀립니다. 조건부 UPDATE(status = IN_PROGRESS)라 동시에 들어온 두 종료
     * 요청 중 하나만 전이에 성공하고, 나머지는 다음 호출에서 alreadyEnded로
     * 걸러집니다.
     */
    @Transactional
    public EndTransition markEnded(String sessionId) {

        Long consultationId = extractConsultationId(sessionId);

        Consultation consultation = consultationRepository
            .findByIdForUpdate(consultationId)
            .orElseThrow(
                () -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND)
            );

        // 이미 종료된 상담에 대한 재요청은 성공으로 처리합니다.
        if (consultation.getStatus() == ConsultationStatus.ENDED) {
            return new EndTransition(
                consultationId,
                consultation.getRecordId(),
                true
            );
        }

        if (consultation.getStatus() != ConsultationStatus.IN_PROGRESS) {
            throw new BusinessException(ErrorCode.CONSULTATION_NOT_IN_PROGRESS);
        }

        /*
         * 녹음 ID가 없어도 종료는 진행합니다.
         *
         * 예전에는 record_id가 비어 있으면 RECORDING_NOT_FOUND로 거절했는데,
         * 그러면 녹음 시작이 실패한 상담이 IN_PROGRESS로 영구히 남아 사용자가
         * 다음 도움 요청조차 못 하게 됩니다(409 CONSULTATION_DUPLICATED).
         * 통화는 실제로 끝났으므로 상태는 끝난 대로 기록하고, 녹음 쪽 이상은
         * 호출부가 로그로 남깁니다.
         */
        int updatedCount = consultationRepository.endConsultation(
            consultationId,
            ConsultationStatus.IN_PROGRESS,
            ConsultationStatus.ENDED
        );

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_END_FAILED);
        }

        return new EndTransition(
            consultationId,
            consultation.getRecordId(),
            false
        );
    }

    // consultation-{상담 ID} 형식의 세션 ID에서 상담 ID 추출
    private Long extractConsultationId(String sessionId) {
        if (sessionId == null || !sessionId.startsWith(SESSION_PREFIX)) {
            throw new BusinessException(ErrorCode.INVALID_SESSION_ID);
        }

        try {
            return Long.parseLong(sessionId.substring(SESSION_PREFIX.length()));
        } catch (NumberFormatException exception) {
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }
}
