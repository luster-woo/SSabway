package com.ssafy.ssabway.domain.user.dto.request;

import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GoogleLoginRequest(
        // 구글이 발급한 ID 토큰
        @NotBlank(message = "구글 토큰을 입력해주세요.") String idToken,

        // 첫 로그인이 곧 회원가입이므로 필요함. 기존 사용자는 DB 값을 쓰고 이 값 무시
        @NotNull(message = "언어를 선택해주세요.")Language language
        ) {
}
