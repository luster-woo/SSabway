package com.ssafy.ssabway.domain.user.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.NotNull;

public record LanguageUpdateRequest(
        @NotNull(message = "언어를 선택해주세요.")
        Language language) {
}
