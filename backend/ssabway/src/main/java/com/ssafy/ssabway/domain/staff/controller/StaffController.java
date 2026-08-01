package com.ssafy.ssabway.domain.staff.controller;

import com.ssafy.ssabway.domain.auth.util.RefreshTokenCookieProvider;
import com.ssafy.ssabway.domain.staff.dto.request.StaffLoginRequest;
import com.ssafy.ssabway.domain.staff.dto.response.StaffLoginResponse;
import com.ssafy.ssabway.domain.staff.dto.response.StaffLoginResult;
import com.ssafy.ssabway.domain.staff.service.StaffService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/staffs")
public class StaffController {

    private final StaffService staffService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<StaffLoginResponse>> login(
            @Valid @RequestBody StaffLoginRequest request) {

        StaffLoginResult result = staffService.login(request);

        ResponseCookie cookie = refreshTokenCookieProvider.create(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그인 되었습니다.",
                                        new StaffLoginResponse(result.accessToken(), result.staffCode())));
    }
}
