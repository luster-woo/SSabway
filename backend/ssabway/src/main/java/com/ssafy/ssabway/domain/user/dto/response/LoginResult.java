package com.ssafy.ssabway.domain.user.dto.response;

import com.ssafy.ssabway.global.common.Language;

/*
    서비스 → 컨트롤러 전달용 / 클라이언트 응답 DTO X
    리프레시 토큰은 쿠키로 나가야 하므로 서비스가 함께 반환하고, 쿠키 생성은 컨트롤러 담당
 */
public record LoginResult(String accessToken, String refreshToken, Language language) {
}
