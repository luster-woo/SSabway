package com.ssafy.ssabway.domain.user.util;

import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_TOKEN_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String GOOGLE_ISSUER = "https://accounts.google.com";

    private final JwtDecoder  jwtDecoder;
    private final String clientId;

    public GoogleTokenVerifier(
            @Value("${spring.security.oauth2.client.registration.google.client-id}") String clientId) {
        this.clientId = clientId;
        this.jwtDecoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_TOKEN_URI).build();
    }

    public GoogleUserInfo verify(String idToken) {
        Jwt jwt;

        try {
            jwt = jwtDecoder.decode(idToken);

        } catch (JwtException e) {
            log.warn("Invalid Google ID token: {} - {}", ErrorCode.INVALID_GOOGLE_TOKEN.name(), e.getMessage());
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }

        if (!jwt.getAudience().contains(clientId)) {
            log.warn("Google ID token audience mismatch: {}", jwt.getAudience());
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }

        String issuer = jwt.getClaimAsString("iss");
        if (!GOOGLE_ISSUER.equals(issuer) && !"accounts.google.com".equals(issuer)) {
            log.warn("Google ID token issuer mismatch: {}", issuer);
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }

        String providerId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        if (email == null) {
            log.warn("Google ID token has no email claim");
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }

        return new GoogleUserInfo(providerId, email.trim().toLowerCase());
    }
}