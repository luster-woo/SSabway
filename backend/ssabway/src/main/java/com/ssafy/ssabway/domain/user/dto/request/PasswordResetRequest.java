package com.ssafy.ssabway.domain.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(

        @NotBlank(message = "이메일을 입력해주세요.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @Size(max = 240, message = "이메일이 너무 깁니다.")
        String email,

        // 회원가입과 동일한 보안 정책
        @NotBlank(message = "비밀번호를 입력해주세요.")
        @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하여야 합니다.")
        @Pattern(regexp = "^\\S+$", message = "비밀번호에 공백을 포함할 수 없습니다.")
        String newPassword
) {
}