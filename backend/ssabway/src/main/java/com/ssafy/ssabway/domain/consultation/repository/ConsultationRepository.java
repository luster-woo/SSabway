package com.ssafy.ssabway.domain.consultation.repository;

import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.entity.Consultation;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}