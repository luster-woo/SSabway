package com.ssafy.ssabway.domain.user.entity;

import com.ssafy.ssabway.global.common.Language;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/*
    users 테이블 매핑 엔티티

    회원 종류는 provider로 구분되며, 아래 조합만 유효
      LOCAL  : passwordHash 존재, providerId NULL
      GOOGLE : passwordHash NULL, providerId 존재

    생성자를 private으로 막고 정적 팩토리(createLocal, createGoogle)만 노출해 위 조합 외의 객체가 만들어지지 않게 함
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    // PK : MySQL AUTO_INCREMENT가 발급 (IDENTITY 전략)
    // 저장 전에는 null이어야 하므로 원시 타입이 아닌 Long 사용
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    // 탈퇴 시 UNIQUE 제약 회피(동일 이메일 재가입 불가능) 를 위해 deleted_{userId}_{email} 형태로 변조
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    // 소셜 가입자는 NULL
    @Column(name = "password_hash")
    private String passwordHash;

    // EnumType.STRING이 없으면 선언 순서가 정수로 저장되므로 반드시 명시
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private Provider provider;

    // LOCAL 가입자는 NULL, GOOGLE은 구글이 발급한 sub 값
    @Column(name = "provider_id", length = 100)
    private String providerId;

    // ISO 639-1 대문자 (KO|EN|JA|ZH)
    // DB DEFAULT는 JPA가 사용하지 않으므로 생성 시점에 값을 반드시 넣어야 한다
    @Enumerated(EnumType.STRING)
    @Column(name = "language", nullable = false, length = 10)
    private Language language;

    // insert 시점에 Hibernate가 채움. 이후 변경되지 않도록 updatable = false
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 탈퇴 시각. NULL이면 활성 회원 (소프트 삭제)
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    private User(String email, String passwordHash, Provider provider, String providerId, Language language) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.provider = provider;
        this.providerId = providerId;
        this.language = language;
    }

    /*
        이메일/비밀번호 로컬 가입
        passwordHash는 인코딩이 끝난 값을 받는다 (엔티티는 인코딩에 관여하지 않음)
     */
    public static User createLocal(String email, String passwordHash, Language language){
        return new User(email, passwordHash, Provider.LOCAL, null, language);
    }

    /*
        구글 소셜 가입
        비밀번호가 없으므로 passwordHash는 NULL로 둔다
     */
    public static User createGoogle(String email, String providerId, Language language){
        return new User(email, null, Provider.GOOGLE, providerId, language);
    }

    /*
        소프트 삭제. deleted_at을 찍고 email과 provider_id를 변조시킴

        UNIQUE(email) / UNIQUE(provider, provider_id) 제약때문에 변조하지 않으면 탈퇴한 사용자가 같은 이메일로 재가입 불가능
     */
    public void withdraw() {
        this.deletedAt = LocalDateTime.now();
        this.email = "deleted_" + this.id + "_" + this.email;

        if (this.providerId != null) this.providerId = "deleted_" + this.id + "_" + this.providerId;

    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
