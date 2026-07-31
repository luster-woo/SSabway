package com.ssafy.ssabway.domain.user.util;

// 구글 ID 토큰에서 꺼낸 값. 내부 전달용
public record GoogleUserInfo(String providerId, String email) {
}
