package com.ssafy.ssabway.domain.consultation.entity;

// 상태 전이는 webrtc 담당 / ssabway WAITING 조회와 ENDED 조회만
public enum ConsultationStatus {
    WAITING,
    MATCHED,
    IN_PROGRESS,
    ENDED,
    CANCELED
}
