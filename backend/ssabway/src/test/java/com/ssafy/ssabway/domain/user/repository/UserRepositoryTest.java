package com.ssafy.ssabway.domain.user.repository;

import com.ssafy.ssabway.domain.user.entity.Provider;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.global.common.Language;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import static org.assertj.core.api.Assertions.assertThat;

/*
    User 엔티티 매핑이 실제 DB와 왕복하는지 검증한다
    ddl-auto: validate는 컬럼 존재와 타입만 대조하므로
    enum 저장 형태와 @CreationTimestamp 동작은 이 테스트에서만 확인된다

    @AutoConfigureTestDatabase(replace = NONE)
      @DataJpaTest는 기본적으로 인메모리 DB로 교체하려 하므로, 실제 MySQL을 쓰도록 끈다

    @DataJpaTest는 각 테스트 메서드를 트랜잭션으로 감싸고 종료 시 롤백하므로
    테스트 데이터가 DB에 남지 않는다 (AUTO_INCREMENT 카운터는 증가함)
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Autowired
    UserRepository userRepository;

    @Autowired
    EntityManager em;

    @Test
    @DisplayName("회원을 저장하면 id와 createdAt이 자동으로 채워진다")
    void saveUser() {
        User user = User.createLocal("save@test.com", "{bcrypt}dummyhash", Language.KO);

        User saved = userRepository.save(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("save@test.com");
        assertThat(saved.getProvider()).isEqualTo(Provider.LOCAL);
        assertThat(saved.getProviderId()).isNull();
        assertThat(saved.getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("enum은 ordinal이 아닌 이름 문자열로 저장된다")
    void enumStoredAsString() {
        User user = User.createGoogle("enum@test.com", "google-sub-12345", Language.JA);

        // save만 하면 INSERT가 지연될 수 있으므로 flush로 DB에 즉시 반영한다
        userRepository.saveAndFlush(user);

        // 영속성 컨텍스트를 비워 캐시가 아닌 DB에서 읽도록 한다
        em.clear();

        // 네이티브 쿼리로 실제 컬럼에 저장된 문자열을 확인한다
        Object[] row = (Object[]) em.createNativeQuery(
                        "SELECT provider, language FROM users WHERE email = 'enum@test.com'")
                .getSingleResult();

        assertThat(row[0]).isEqualTo("GOOGLE");
        assertThat(row[1]).isEqualTo("JA");
    }
}