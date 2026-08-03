package com.ssafy.ssabway_webrtc.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "consultations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "consultation_id")
    private Long id;

    @Column(name = "requester_user_id", nullable = false)
    private Long requesterUserId;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ConsultationStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "record_id", length = 255)
    private String recordId;

    @Column(name = "record_s3", length = 500)
    private String recordS3;

    @Column(name = "summary", length = 255)
    private String summary;

    /**
     * 사용자 도움 요청으로 새로운 대기 상담을 생성.
     *
     * 역무원은 상담 수락 시점에 배정되므로 staffId는 설정하지 않고,
     * 상담 상태는 WAITING, 요청 시간은 현재 시간으로 초기화.
     *
     * @param requesterUserId JWT에서 확인한 상담 요청자 ID
     * @return WAITING 상태의 새로운 상담 Entity
     */
    public static Consultation createWaiting(Long requesterUserId, Long staffId) {
        Consultation consultation = new Consultation();

        consultation.requesterUserId = requesterUserId;
        consultation.staffId = staffId;
        consultation.status = ConsultationStatus.WAITING;
        consultation.requestedAt = LocalDateTime.now();

        return consultation;
    }

}
