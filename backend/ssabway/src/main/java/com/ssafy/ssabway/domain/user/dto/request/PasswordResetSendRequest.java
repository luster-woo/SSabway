package com.ssafy.ssabway.domain.user.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordResetSendRequest(

        @NotBlank(message = "이메일을 입력해주세요.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @Size(max = 240, message = "이메일이 너무 깁니다.")
        String email,

        @NotNull(message = "언어를 선택해주세요.")
        Language language
) {
}