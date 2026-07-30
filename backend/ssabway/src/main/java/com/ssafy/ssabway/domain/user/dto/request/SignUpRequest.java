package com.ssafy.ssabway.domain.user.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.*;

public record SignUpRequest(
        @NotBlank @Email @Size(max = 240) String email,
        @NotBlank @Size(min = 8, max = 64)
        @Pattern(regexp = "^\\S+$", message = "비밀번호에 공백을 포함할 수 없습니다") String password,
        @NotNull Language language) {
}