package com.ssafy.ssabway.domain.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String REFRESH_TOKEN_PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;

    public void save(Long userId, String refreshToken, long expirationMillis) {
        redisTemplate.opsForValue().set(
                REFRESH_TOKEN_PREFIX + userId,
                refreshToken,
                Duration.ofMillis(expirationMillis)
        );
    }

    // 저장해둔 리프레시 토큰과 일치하는지 확인, 액세스 토큰 재발급과 로그아웃에서 사용
    public boolean checkToken(Long userId, String refreshToken) {
        String storedRefreshToken = redisTemplate.opsForValue().get(REFRESH_TOKEN_PREFIX + userId);

        return refreshToken.equals(storedRefreshToken);
    }

    // 로그아웃, 리프레시 토큰 삭제
    public void delete(Long userId) {
        redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
    }
}
