package com.ssafy.ssabway.domain.consultation.entity;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
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

    @Column(nullable = false)
    private String departure;

    @Column(nullable = false)
    private String destination;

    // STRING이 아니면 enum 순서를 숫자로 저장한다.
    // DB에는 이미 'WAITING' 같은 문자열이 들어 있으므로 필수
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConsultationStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "record_id")
    private String recordId;

    @Column(name = "record_s3", length = 500)
    private String recordS3;

    @Column
    private String summary;

    // 로그인 사용자와 출발역 담당 역무원을 이용해
    // WAITING 상태의 상담 요청을 생성.
    public static Consultation createWaiting(
            Long requesterUserId,
            Long staffId,
            String departure,
            String destination
    ) {
        Consultation consultation = new Consultation();

        consultation.requesterUserId = requesterUserId;
        consultation.staffId = staffId;
        consultation.departure = departure;
        consultation.destination = destination;
        consultation.status = ConsultationStatus.WAITING;
        consultation.requestedAt = LocalDateTime.now();

        return consultation;
    }
}
