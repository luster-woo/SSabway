package com.ssafy.ssabway_webrtc.domain.dto;

import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 사용자의 상담 요청이 대기열에 등록된 결과를 반환.
 *
 * 최초 등록 시 역무원과 상담 시작 시간은 아직 존재하지 않으므로
 * staffName과 startedAt은 null로 반환.
 */
@Getter
@AllArgsConstructor
public class ConsultationCreateResponse {

    private Long consultationId;
    private ConsultationStatus status;
    private Long queuePosition;
    private String staffName;
    private LocalDateTime requestedAt;
    private LocalDateTime startedAt;
}
