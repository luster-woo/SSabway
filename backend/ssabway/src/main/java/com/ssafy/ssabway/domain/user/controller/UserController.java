package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationConfirmRequest;
import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationSendRequest;
import com.ssafy.ssabway.domain.user.dto.request.SignUpRequest;
import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.dto.response.EmailVerificationSendResponse;
import com.ssafy.ssabway.domain.user.service.EmailVerificationService;
import com.ssafy.ssabway.domain.user.service.UserService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailVerificationService emailVerificationService;

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

        return ResponseEntity.ok(ApiResponse.ok("회원가입 완료되었습니다."));
    }
}