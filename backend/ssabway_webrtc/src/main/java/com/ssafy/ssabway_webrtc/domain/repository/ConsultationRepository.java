package com.ssafy.ssabway_webrtc.domain.repository;


import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
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

    // 진행 중인 상담만 종료 상태로 변경해 중복 종료를 방지
    @Transactional
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.status = 'ENDED',
            c.endedAt = CURRENT_TIMESTAMP
        WHERE c.id = :consultationId
          AND c.status = 'IN_PROGRESS'
    """)
    int endConsultation(
        @Param("consultationId") Long consultationId
    );
}
