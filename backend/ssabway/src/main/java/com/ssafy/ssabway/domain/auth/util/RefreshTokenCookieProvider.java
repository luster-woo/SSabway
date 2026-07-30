package com.ssafy.ssabway.domain.auth.util;

import com.ssafy.ssabway.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieProvider {

    public static final String COOKIE_NAME = "refresToken";
    private static final String COOKIE_PATH = "/api/v1/auth";
    private final JwtProvider jwtProvider;

        /*
            httpOnly - 자바스크립트가 읽을 수 없다. 리프레시 토큰은 14일짜리라 탈취되면 피해가 큼
            secure   - https에서만 전송. localhost는 브라우저가 예외로 두어 로컬 개발도 동작
            sameSite - Strict. 다른 사이트에서 온 요청에는 쿠키가 실리지 않아 CSRF가 사실상 닫힘.
            path     - /api/v1/auth 이하만. 다른 API 요청에 실려 나갈 이유가 없음
            maxAge   - Redis TTL과 같은 값에서 나와야 한다. 따로 적으면 한쪽만 살아 있는 상태가 생김.
        */

    public ResponseCookie create(String refreshToken) {
        return ResponseCookie.from(COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(Duration.ofMillis(jwtProvider.getRefreshTokenExpiration()))
                .build();
    }

    // 로그아웃용 (값을 비우고 maxAge = 0으로 세팅하면 브라우저에서 즉시 삭제)
    public ResponseCookie expire() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
