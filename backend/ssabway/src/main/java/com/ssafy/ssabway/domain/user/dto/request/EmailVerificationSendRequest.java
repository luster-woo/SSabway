package com.ssafy.ssabway.domain.user.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmailVerificationSendRequest(
        @NotBlank @Email @Size(max=240) String email,
        @NotNull Language language ){
}
