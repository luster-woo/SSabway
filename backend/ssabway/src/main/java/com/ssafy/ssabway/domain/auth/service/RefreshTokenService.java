package com.ssafy.ssabway.domain.auth.service;

import com.ssafy.ssabway.global.jwt.TokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    // users와 staffs는 별도 테이블이라 id가 겹쳐서 접두사로 구분
    private static final String USER_REFRESH_TOKEN_PREFIX = "refresh:user:";
    private static final String STAFF_REFRESH_TOKEN_PREFIX = "refresh:staff:";

    private final StringRedisTemplate redisTemplate;

    public void save(TokenType type, Long id, String refreshToken, long expirationMillis) {
        redisTemplate.opsForValue().set(
                key(type, id),
                refreshToken,
                Duration.ofMillis(expirationMillis)
        );
    }

    // 저장해둔 리프레시 토큰과 일치하는지 확인, 액세스 토큰 재발급과 로그아웃에서 사용
    public boolean checkToken(TokenType type, Long id, String refreshToken) {
        String storedRefreshToken = redisTemplate.opsForValue().get(key(type, id));

        return refreshToken.equals(storedRefreshToken);
    }

    // 로그아웃, 리프레시 토큰 삭제
    public void delete(TokenType type, Long id) {
        redisTemplate.delete(key(type, id));
    }

    private String key(TokenType type, Long id) {
        String prefix = switch (type) {
            case USER -> USER_REFRESH_TOKEN_PREFIX;
            case STAFF -> STAFF_REFRESH_TOKEN_PREFIX;
        };

        return prefix + id;
    }
}