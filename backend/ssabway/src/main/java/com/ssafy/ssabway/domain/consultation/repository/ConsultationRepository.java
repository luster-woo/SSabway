package com.ssafy.ssabway.domain.consultation.repository;

import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationInfoResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.HistoryResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.entity.Consultation;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // 오래 기다린 순. 정렬이 없으면 DB가 순서를 보장하지 않아
    // 페이지 간에 행이 중복되거나 누락된다
    @Query("""
            SELECT new com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse(
                       c.id, u.email, c.departure, c.destination, u.language, c.requestedAt)
            FROM Consultation c
            JOIN User u ON u.id = c.requesterUserId
            WHERE c.staffId = :staffId AND c.status = :status
            ORDER BY c.requestedAt ASC
    """)
    Page<WaitingResponse> findByStaffIdAndStatus(@Param("staffId") Long staffId,
                                                 @Param("status") ConsultationStatus status,
                                                 Pageable pageable);


    // 상담방에서 쓰는 사용자 정보 단건. 수락하면 대기 목록에서 사라지므로
    // 거기서 못 가져오고, 자막이 사용자 언어를 알아야 시작된다.
    // 위와 같은 이유로 staffId 조건을 같이 건다.
    @Query("""
            SELECT new com.ssafy.ssabway.domain.consultation.dto.response.ConsultationInfoResponse(
                       c.id, u.email, c.departure, c.destination, u.language)
            FROM Consultation c
            JOIN User u ON u.id = c.requesterUserId
            WHERE c.id = :id AND c.staffId = :staffId
            """)
    Optional<ConsultationInfoResponse> findInfoByIdAndStaffId(@Param("id") Long id,
                                                              @Param("staffId") Long staffId);


    // staffId 조건이 없으면 id만 바꿔가며 남의 역 상담을 훔쳐볼 수 있음
    @Query("""
            SELECT new com.ssafy.ssabway.domain.consultation.repository.ConsultationDetail(
                       u.email, c.summary, c.recordS3)
            FROM Consultation c
            JOIN User u ON u.id = c.requesterUserId
            WHERE c.id = :id AND c.staffId = :staffId
            """)
    Optional<ConsultationDetail> findDetailByIdAndStaffId(@Param("id") Long id,
                                                          @Param("staffId") Long staffId);


    /*
        LEFT JOIN + CASE로 행마다 차단 여부를 한 번에 뽑d음
        이게 없으면 프론트가 행마다 블랙리스트를 따로 조회해야 한다(N+1).

        LEFT JOIN인 이유: 차단되지 않은 사용자도 목록에 나와야 하므로
        블랙리스트에 짝이 없어도 상담 행은 살아 있어야 한다.

        조인 조건의 releasedAt IS NULL이 곧 "지금 차단 중"의 정의다.
        해제 이력이 있으면 같은 user_id로 행이 여러 개이므로 이 조건이 빠지면
        예전에 풀린 기록까지 걸려 차단 중으로 표시된다.
     */
    @Query("""
            SELECT new com.ssafy.ssabway.domain.consultation.dto.response.HistoryResponse(
                       c.id, u.email, c.summary, c.startedAt, c.endedAt,
                       CASE WHEN b.id IS NOT NULL THEN true ELSE false END)
            FROM Consultation c
            JOIN User u ON u.id = c.requesterUserId
            LEFT JOIN Blacklist b ON b.userId = c.requesterUserId
                                 AND b.staffId = c.staffId
                                 AND b.releasedAt IS NULL
            WHERE c.staffId = :staffId AND c.status = :status
            ORDER BY c.startedAt DESC
            """)
    Page<HistoryResponse> findHistoryByStaffIdAndStatus(@Param("staffId") Long staffId,
                                                        @Param("status") ConsultationStatus status,
                                                        Pageable pageable);

    // 사용자가 대기·매칭·상담 중인 요청을 이미 가지고 있는지 확인
    boolean existsByRequesterUserIdAndStatusIn(
            Long requesterUserId,
            Collection<ConsultationStatus> statuses
    );

    // 해당 역무원에게 등록된 WAITING 상담 수를 계산
    long countByStaffIdAndStatus(
            Long staffId,
            ConsultationStatus status
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
    UPDATE Consultation c
       SET c.status = :nextStatus
     WHERE c.id = :consultationId
       AND c.staffId = :staffId
       AND c.status = :currentStatus
    """)
    int acceptConsultation(
            @Param("staffId") Long staffId,
            @Param("consultationId") Long consultationId,
            @Param("currentStatus") ConsultationStatus currentStatus,
            @Param("nextStatus") ConsultationStatus nextStatus
    );
}