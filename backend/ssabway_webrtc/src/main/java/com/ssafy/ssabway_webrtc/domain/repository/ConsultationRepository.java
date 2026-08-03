package com.ssafy.ssabway_webrtc.domain.repository;


import com.ssafy.ssabway_webrtc.domain.entity.Consultation;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    /**
     * 대기 중인 상담을 특정 역무원에게 배정합니다.
     *
     * 상담 상태가 WAITING이고 아직 역무원이 배정되지 않은 경우에만
     * 수정되므로 여러 역무원이 동시에 수락하더라도 한 명만 성공합니다.
     *
     * @return 배정 성공 시 1, 이미 배정됐거나 대기 상태가 아니면 0
     */
    @Modifying(
        clearAutomatically = true,
        flushAutomatically = true
    )
    @Query("""
        UPDATE Consultation c
        SET c.staffId = :staffId,
            c.status = :nextStatus
        WHERE c.id = :consultationId
          AND c.status = :currentStatus
          AND c.staffId IS NULL
    """)
    int acceptConsultation(
        @Param("consultationId") Long consultationId,
        @Param("staffId") Long staffId,
        @Param("currentStatus") ConsultationStatus currentStatus,
        @Param("nextStatus") ConsultationStatus nextStatus
    );

    /**
     * 특정 상담의 현재 대기 순번을 계산합니다.
     *
     * 요청 시간이 빠른 WAITING 상담을 앞 순서로 계산하고,
     * 요청 시간이 같으면 상담 ID가 작은 상담을 먼저 처리합니다.
     * 조회 대상 상담 자신까지 포함하므로 반환값은 1부터 시작합니다.
     */
    @Query("""
    SELECT COUNT(c)
    FROM Consultation c
    WHERE c.status = :status
      AND (
          c.requestedAt < :requestedAt
          OR (
              c.requestedAt = :requestedAt
              AND c.id <= :consultationId
          )
      )
    """)
    long calculateQueuePosition(
        @Param("status") ConsultationStatus status,
        @Param("requestedAt") LocalDateTime requestedAt,
        @Param("consultationId") Long consultationId
    );
}
