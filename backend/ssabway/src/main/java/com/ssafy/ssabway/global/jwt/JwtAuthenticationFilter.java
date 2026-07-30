package com.ssafy.ssabway.global.jwt;

import com.ssafy.ssabway.global.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ERROR_CODE_ATTRIBUTE = "jwtErrorCode";

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtProvider jwtProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = resolveToken(request);


        // 토큰이 없으면 아무것도 하지 않고 통과
        // 뒤쪽에서 SecurityConfig의 규칙에 따라 판단하고, 필요했는데 없으면 EntryPoint가 응답
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtProvider.parseClaims(token);
            Long userId = Long.valueOf(claims.getSubject());

            // 인증 정보를 SecurityContext에 저장
            // principal에 userId를 담아, 이후 컨트롤러가 "누가 요청했는지" 알 수 있게 한다.
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of());

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (ExpiredJwtException e) {
            // 만료는 재발급으로 해결 가능하므로 위조와 구분해서 전달한다
            log.warn("Expired access token: {} - {}", ErrorCode.ACCESS_TOKEN_EXPIRED.name(), e.getMessage());
            request.setAttribute(ERROR_CODE_ATTRIBUTE, ErrorCode.ACCESS_TOKEN_EXPIRED);

        } catch (JwtException | IllegalArgumentException e) {
            // 서명 불일치, 형식 오류, 빈 문자열 등. 재로그인이 필요한 상태
            log.warn("Invalid access token: {} - {}", ErrorCode.INVALID_TOKEN.name(), e.getMessage());
            request.setAttribute(ERROR_CODE_ATTRIBUTE, ErrorCode.INVALID_TOKEN);
        }

        filterChain.doFilter(request, response);
    }

    // "Bearer {토큰}" 형태에서 토큰만 떼어냄
    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(AUTHORIZATION_HEADER);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
