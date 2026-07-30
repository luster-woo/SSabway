package com.ssafy.ssabway.domain.user.dto.response;

import com.ssafy.ssabway.global.common.Language;

public record LoginResponse(String accessToken,
                            Language language) {
}
