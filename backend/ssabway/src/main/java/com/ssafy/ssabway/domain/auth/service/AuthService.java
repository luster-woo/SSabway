package com.ssafy.ssabway.domain.auth.service;

import com.ssafy.ssabway.domain.auth.dto.response.AccessTokenReissueResponse;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import com.ssafy.ssabway.global.jwt.JwtProvider;
import com.ssafy.ssabway.global.jwt.TokenType;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    public AccessTokenReissueResponse reissue(String refreshToken) {

        if (refreshToken == null) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        Long userId = parseUserId(refreshToken);

        // refresh token 대조
        if (!refreshTokenService.checkToken(userId, refreshToken)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        String accessToken = jwtProvider.createAccessToken(userId, TokenType.USER);

        return new AccessTokenReissueResponse(accessToken);
    }


    public void logout(String refreshToken) {

        if (refreshToken == null) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        Long userId = parseUserId(refreshToken);

        // 대조 없이 삭제하면 다른 사람 userId로 로그아웃시킬 수도 있음
        if (!refreshTokenService.checkToken(userId, refreshToken)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        refreshTokenService.delete(userId);
    }

    private Long parseUserId(String refreshToken) {
        try {
            Claims claims = jwtProvider.parseClaims(refreshToken);

            return Long.valueOf(claims.getSubject());
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
    }
}
