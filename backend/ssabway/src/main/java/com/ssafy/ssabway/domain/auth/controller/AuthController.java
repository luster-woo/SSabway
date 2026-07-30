package com.ssafy.ssabway.domain.auth.controller;

import com.ssafy.ssabway.domain.auth.dto.response.AccessTokenReissueResponse;
import com.ssafy.ssabway.domain.auth.service.AuthService;
import com.ssafy.ssabway.domain.auth.util.RefreshTokenCookieProvider;
import com.ssafy.ssabway.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AccessTokenReissueResponse>> reissue(
            @CookieValue(value = RefreshTokenCookieProvider.COOKIE_NAME, required = false) String refreshToken) {

        AccessTokenReissueResponse response = authService.reissue(refreshToken);

        return ResponseEntity.ok(ApiResponse.ok("액세스 토큰이 재발급되었습니다.", response));
    }
}
