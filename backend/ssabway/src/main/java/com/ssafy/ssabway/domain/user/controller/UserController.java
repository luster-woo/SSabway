package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.auth.util.RefreshTokenCookieProvider;
import com.ssafy.ssabway.domain.user.dto.request.*;
import com.ssafy.ssabway.domain.user.dto.response.*;
import com.ssafy.ssabway.domain.user.service.EmailVerificationService;
import com.ssafy.ssabway.domain.user.service.UserService;
import com.ssafy.ssabway.global.common.ApiResponse;
import com.ssafy.ssabway.global.jwt.JwtProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailVerificationService emailVerificationService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<EmailDuplicateResponse>> checkEmailDuplicate(
            @RequestParam @NotBlank @Email String email){

        EmailDuplicateResponse response = userService.checkEmailDuplicate(email);

        String message = response.isDuplicate() ? "이미 사용 중인 이메일입니다."
                                                : "사용 가능한 이메일입니다.";

        return ResponseEntity.ok(ApiResponse.ok(message, response));
    }

    @PostMapping("/email/requests")
    public ResponseEntity<ApiResponse<EmailVerificationSendResponse>> sendVerificationCode(
            @Valid @RequestBody EmailVerificationSendRequest request) {

        EmailVerificationSendResponse response = emailVerificationService.sendCode(request);

        return ResponseEntity.ok(ApiResponse.ok("인증 코드가 발송되었습니다.", response));
    }

    @PostMapping("/email/verification")
    public ResponseEntity<ApiResponse<Void>> confirmVerificationCode(
            @Valid @RequestBody EmailVerificationConfirmRequest request) {

        emailVerificationService.confirmCode(request);

        return ResponseEntity.ok(ApiResponse.ok("인증번호 검증이 완료되었습니다."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> signup(@Valid @RequestBody SignUpRequest request) {
        userService.signup(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("회원가입이 완료되었습니다."));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<Void>> withdraw(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody WithdrawRequest request) {

        userService.withdraw(userId, request);

        ResponseCookie cookie = refreshTokenCookieProvider.expire();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("회원탈퇴에 성공하였습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = userService.login(request);

        ResponseCookie cookie = refreshTokenCookieProvider.create(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그인 되었습니다.", new LoginResponse(result.accessToken(), result.language())));
    }

    @PostMapping("/login/google")
    public ResponseEntity<ApiResponse<LoginResponse>> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request) {
        LoginResult result = userService.googleLogin(request);

        ResponseCookie cookie = refreshTokenCookieProvider.create(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그인 되었습니다.", new LoginResponse(result.accessToken(), result.language())));
    }

    @PatchMapping("/language")
    public ResponseEntity<ApiResponse<Void>> updateLanguage(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody LanguageUpdateRequest request) {

        userService.updateLanguage(userId, request);

        return ResponseEntity.ok(ApiResponse.ok("언어 설정이 완료되었습니다."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserMeResponse>> getMe(
            @AuthenticationPrincipal Long userId) {

        return ResponseEntity.ok(ApiResponse.ok("조회 성공",userService.getMe(userId)));
    }
}