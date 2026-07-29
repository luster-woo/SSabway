package com.ssafy.ssabway.domain.user.controller;

import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.service.UserService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<EmailDuplicateResponse>> checkEmailDuplcate(
            @RequestParam @NotBlank @Email String email){

        EmailDuplicateResponse response = userService.checkEmailDuplicate(email);

        String message = response.isDuplicate() ? "이미 사용 중인 이메일입니다."
                                                : "사용 가능한 이메일입니다.";

        return ResponseEntity.ok(ApiResponse.ok(message, response));
    }
}
