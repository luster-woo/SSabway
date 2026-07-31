package com.ssafy.ssabway.domain.auth.controller;

import com.ssafy.ssabway.domain.auth.dto.response.AccessTokenReissueResponse;
import com.ssafy.ssabway.domain.auth.service.AuthService;
import com.ssafy.ssabway.domain.auth.util.RefreshTokenCookieProvider;
import com.ssafy.ssabway.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AccessTokenReissueResponse>> reissue(
            @CookieValue(value = RefreshTokenCookieProvider.COOKIE_NAME, required = false) String refreshToken) {

        AccessTokenReissueResponse response = authService.reissue(refreshToken);

        return ResponseEntity.ok(ApiResponse.ok("액세스 토큰이 재발급되었습니다.", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(value = RefreshTokenCookieProvider.COOKIE_NAME, required = false) String refreshToken) {

        authService.logout(refreshToken);

        ResponseCookie cookie = refreshTokenCookieProvider.expire();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그아웃 되었습니다."));
    }
}
