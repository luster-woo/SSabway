package com.ssafy.ssabway_webrtc.domain.repository;


import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // 중복 웹훅이 와도 기존 S3 객체 키를 덮어쓰지 않도록 조건부 업데이트
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.recordS3 = :s3ObjectKey
        WHERE c.id = :consultationId
            AND c.recordS3 IS NULL
    """)
    int updateRecordS3(
        @Param("consultationId") Long consultationId,
        @Param("s3ObjectKey") String s3ObjectKey
    );

    // 지정된 현재 상태의 상담만 시작 상태로 변경하고 녹음 ID를 저장
    @Transactional
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.status = :nextStatus,
            c.startedAt = CURRENT_TIMESTAMP,
            c.recordId = :recordId
        WHERE c.id = :consultationId
          AND c.status = :currentStatus
    """)
    int startConsultation(
        @Param("consultationId") Long consultationId,
        @Param("recordId") String recordId,
        @Param("currentStatus") ConsultationStatus currentStatus,
        @Param("nextStatus") ConsultationStatus nextStatus
    );

    // 지정된 현재 상태의 상담만 종료 상태로 변경하고 종료 시간을 저장
    @Transactional
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.status = :nextStatus,
            c.endedAt = CURRENT_TIMESTAMP
        WHERE c.id = :consultationId
          AND c.status = :currentStatus
    """)
    int endConsultation(
        @Param("consultationId") Long consultationId,
        @Param("currentStatus") ConsultationStatus currentStatus,
        @Param("nextStatus") ConsultationStatus nextStatus
    );
}
