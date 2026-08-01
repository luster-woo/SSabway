package com.ssafy.ssabway.domain.staff.dto.response;

public record StaffLoginResponse(
        String accessToken,
        String staffCode
) {
}
