package com.ssafy.ssabway.domain.user.repository;

import com.ssafy.ssabway.domain.user.entity.Provider;
import com.ssafy.ssabway.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/*
    users 테이블 접근 레포지토리

    JpaRepository <Entity 타입, PK 타입>을 상속하면
    save, findById, findAll, delete 등 기본 CRUD 메서드 제공
 */
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    // 해당 이메일로 user가 있을 수도 없을 수도 있으므로 Optional 사용
    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    Optional<User> findByProviderAndProviderIdAndDeletedAtIsNull(Provider provider, String providerId);
}
