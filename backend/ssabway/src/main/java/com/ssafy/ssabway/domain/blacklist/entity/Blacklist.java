package com.ssafy.ssabway.domain.blacklist.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Getter
@Table(name = "blacklists")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Blacklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "blacklist_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Convert(converter = BlacklistReasonConverter.class)
    @Column(name = "reason")
    private Set<BlacklistReason> reasons;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    public Blacklist(Long userId, Long staffId, Set<BlacklistReason> reasons) {
        this.userId = userId;
        this.staffId = staffId;
        this.reasons = reasons;
        this.registeredAt = LocalDateTime.now();
    }

    public static Blacklist register(Long userId, Long staffId, Set<BlacklistReason> reasons) {
        return new Blacklist(userId, staffId, reasons);
    }
}
