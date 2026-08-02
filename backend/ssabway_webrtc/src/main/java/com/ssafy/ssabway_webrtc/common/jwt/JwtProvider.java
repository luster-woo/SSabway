package com.ssafy.ssabway_webrtc.common.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

@Component
public class JwtProvider {
    private final SecretKey secretKey;

    // sub만으로는 users/staffs의 id가 겹쳐(테이블이 다름) 주체를 구분할 수 없어 type 클레임을 넣음
    private static final String TYPE_CLAIM = "type";

    public JwtProvider(
        @Value("${jwt.secret}") String secret
    ) {
        this.secretKey = Keys.hmacShaKeyFor(
            Decoders.BASE64.decode(secret)
        );
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    // type이 없으면(구 토큰) valueOf가 NPE를 던져 500이 되므로 IllegalArgumentException을 던짐
    // 호출부가 "없음"과 "이상한 값"을 한 catch로 처리할 수 있다.
    public TokenType getTokenType(Claims claims) {
        String type = claims.get(TYPE_CLAIM, String.class);

        if (type == null) throw new IllegalArgumentException("type 클레임 없음");

        return TokenType.valueOf(type);
    }
}
