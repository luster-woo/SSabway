package com.ssafy.ssabway.domain.staff.dto.response;

public record StaffLoginResult(
        String accessToken,
        String refreshToken,
        String staffCode
) {
}
