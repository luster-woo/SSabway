package com.ssafy.ssabway.domain.blacklist.repository;

import com.ssafy.ssabway.domain.blacklist.entity.Blacklist;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlacklistRepository extends JpaRepository<Blacklist, Long> {

    boolean existsByUserIdAndReleasedAtIsNull(Long userId);
}
