package com.ssafy.ssabway.domain.route.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.NotNull;

public record RouteSearchRequest(
        @NotNull Language language,
        @NotNull Double startX,
        @NotNull Double startY,
        @NotNull Double endX,
        @NotNull Double endY
) {}