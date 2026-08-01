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

    // 액세스 토큰 재발급 메서드
    public AccessTokenReissueResponse reissue(String refreshToken) {

        if (refreshToken == null) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        RefreshTokenInfo info = parseRefreshToken(refreshToken);

        // refresh token 대조
        if (!refreshTokenService.checkToken(info.type(), info.id(), refreshToken)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        String accessToken = jwtProvider.createAccessToken(info.id(), info.type());

        return new AccessTokenReissueResponse(accessToken);
    }


    public void logout(String refreshToken) {

        if (refreshToken == null) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        RefreshTokenInfo info = parseRefreshToken(refreshToken);

        // 대조 없이 삭제하면 다른 사람 id로 로그아웃시킬 수도 있음
        if (!refreshTokenService.checkToken(info.type(), info.id(), refreshToken)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);

        refreshTokenService.delete(info.type(), info.id());
    }

    // subject, type 클레임 추출이 모두 예외를 던질 수 있어 파싱과 같은 try 안에 위치
    private RefreshTokenInfo parseRefreshToken(String refreshToken) {
        try {
            Claims claims = jwtProvider.parseClaims(refreshToken);

            return new RefreshTokenInfo(
                    jwtProvider.getTokenType(claims),
                    jwtProvider.getId(claims)
            );
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
    }

    // type과 id를 한번에 담을 레코드
    private record RefreshTokenInfo(TokenType type, Long id){}
}
