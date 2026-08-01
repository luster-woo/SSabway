package com.ssafy.ssabway.domain.staff.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StaffLoginRequest(
        @NotBlank String staffCode,
        @NotBlank String password
) {
}
