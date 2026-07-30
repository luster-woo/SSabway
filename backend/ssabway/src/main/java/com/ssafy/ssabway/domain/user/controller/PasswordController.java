package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.user.dto.request.PasswordResetSendRequest;
import com.ssafy.ssabway.domain.user.dto.response.PasswordResetSendResponse;
import com.ssafy.ssabway.domain.user.service.PasswordResetService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
