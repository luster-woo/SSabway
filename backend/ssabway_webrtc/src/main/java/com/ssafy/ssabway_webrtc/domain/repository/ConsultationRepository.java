package com.ssafy.ssabway_webrtc.domain.repository;


import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collection;

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


    @Transactional
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.status = :nextStatus
        WHERE c.id = :consultationId
            AND c.status = :currentStatus
    """)
    int cancelConsultation(
        @Param("consultationId") Long consultationId,
        @Param("currentStatus") ConsultationStatus currentStatus,
        @Param("nextStatus") ConsultationStatus nextStatus
    );

    /**
     * 동일 사용자가 이미 진행 중인 상담을 가지고 있는지 확인.
     *
     * WAITING, MATCHED, IN_PROGRESS 중 하나가 존재하면
     * 새로운 상담 요청을 생성하지 않음.
     */
    boolean existsByRequesterUserIdAndStatusIn(
        Long requesterUserId,
        Collection<ConsultationStatus> statuses
    );

    /**
     * 현재 WAITING 상태인 전체 상담 수를 계산.
     *
     * 새 요청은 대기열 마지막에 들어가므로 저장 직후 WAITING 상담 수를
     * 해당 사용자의 초기 대기 순번으로 사용.
     */
    long countByStatus(
        ConsultationStatus status
    );
}
