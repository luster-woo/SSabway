package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.user.dto.request.PasswordResetRequest;
import com.ssafy.ssabway.domain.user.dto.request.PasswordResetSendRequest;
import com.ssafy.ssabway.domain.user.dto.request.PasswordResetVerifyRequest;
import com.ssafy.ssabway.domain.user.dto.response.PasswordResetSendResponse;
import com.ssafy.ssabway.domain.user.service.PasswordResetService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/password")
@RequiredArgsConstructor
public class PasswordController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/email/requests")
    public ResponseEntity<ApiResponse<PasswordResetSendResponse>> sendCode(
            @Valid @RequestBody PasswordResetSendRequest request) {

        PasswordResetSendResponse response = passwordResetService.sendCode(request);

        return ResponseEntity.ok(ApiResponse.ok("인증 메일이 발송되었습니다.", response));
    }

    @PostMapping("/email/verification")
    public ResponseEntity<ApiResponse<Void>> confirmCode(
            @Valid @RequestBody PasswordResetVerifyRequest request) {

        passwordResetService.confirmCode(request);

        return ResponseEntity.ok(ApiResponse.ok("인증이 완료되었습니다."));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request) {

        passwordResetService.resetPassword(request);

        return ResponseEntity.ok(ApiResponse.ok("비밀번호가 변경되었습니다."));
    }
}
