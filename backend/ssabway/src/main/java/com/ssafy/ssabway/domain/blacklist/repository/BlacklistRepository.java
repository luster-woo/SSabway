package com.ssafy.ssabway.domain.blacklist.repository;

import com.ssafy.ssabway.domain.blacklist.dto.response.BlacklistResponse;
import com.ssafy.ssabway.domain.blacklist.entity.Blacklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BlacklistRepository extends JpaRepository<Blacklist, Long> {

    // 자신이 블랙한 유저만 검색 가능
    boolean existsByUserIdAndStaffIdAndReleasedAtIsNull(Long userId, Long staffId);

    // 해제 이력이 있으면 같은 user_id로 행이 여러 개이므로 released_at IS NULL이 필수.
    // 정렬이 없으면 DB가 순서를 보장 x, 등록 최근 순으로 정렬해서 가져옴
    @Query("""
            SELECT new com.ssafy.ssabway.domain.blacklist.dto.response.BlacklistResponse(
                       u.email, b.reasons, b.registeredAt)
            FROM Blacklist b
            JOIN User u ON u.id = b.userId
            WHERE b.releasedAt IS NULL AND b.staffId = :staffId
            ORDER BY b.registeredAt DESC
            """)
    Page<BlacklistResponse> findActiveByStaffId(@Param("staffId") Long staffId, Pageable pageable);

    // ReleasedAtIsNull 조건이 곧 중복 해제 방어 이미 해제된 행은 조회 x
    Optional<Blacklist> findByUserIdAndStaffIdAndReleasedAtIsNull(Long userId, Long staffId);
}
