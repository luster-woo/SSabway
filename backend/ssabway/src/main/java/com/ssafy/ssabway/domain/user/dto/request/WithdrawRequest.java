package com.ssafy.ssabway.domain.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WithdrawRequest(
        String password
) {
}
