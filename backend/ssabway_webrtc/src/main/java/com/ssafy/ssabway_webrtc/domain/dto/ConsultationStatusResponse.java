package com.ssafy.ssabway_webrtc.domain.dto;

import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 사용자가 요청한 상담의 현재 상태와 연결 정보를 반환
 *
 * WAITING 상태에서는 현재 대기 순번을 반환하고,
 * MATCHED 또는 IN_PROGRESS 상태에서는 OpenVidu 세션 ID를 반환
 */
@Getter
@AllArgsConstructor
public class ConsultationStatusResponse {

    private Long consultationId;

    private ConsultationStatus status;

    private Long queuePosition;

    private String sessionId;

    private LocalDateTime requestedAt;

    private LocalDateTime startedAt;
}
