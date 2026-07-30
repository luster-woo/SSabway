package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationConfirmRequest;
import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationSendRequest;
import com.ssafy.ssabway.domain.user.dto.request.LoginRequest;
import com.ssafy.ssabway.domain.user.dto.request.SignUpRequest;
import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.dto.response.EmailVerificationSendResponse;
import com.ssafy.ssabway.domain.user.dto.response.LoginResponse;
import com.ssafy.ssabway.domain.user.dto.response.LoginResult;
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
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailVerificationService emailVerificationService;
    private final JwtProvider jwtProvider;

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

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = userService.login(request);

        /*
            httpOnly - 자바스크립트가 읽을 수 없다. 리프레시 토큰은 14일짜리라 탈취되면 피해가 크다
            secure   - https에서만 전송. localhost는 브라우저가 예외로 두어 로컬 개발도 동작한다
            sameSite - Strict. 다른 사이트에서 온 요청에는 쿠키가 실리지 않아 CSRF가 사실상 닫힌다
                       개발/배포 모두 프론트 프록시를 거쳐 같은 출처로 들어오므로 문제 없음
            path     - /api/v1/auth 이하만. 다른 API 요청에 실려 나갈 이유가 없다
            maxAge   - Redis TTL과 같은 값에서 나와야 한다. 따로 적으면 한쪽만 살아 있는 상태가 생긴다
         */
        ResponseCookie cookie = ResponseCookie.from("refreshToken", result.refreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(jwtProvider.getRefreshTokenExpiration()))
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그인 되었습니다.", new LoginResponse(result.accessToken(), result.language())));
    }
}