package com.ssafy.ssabway.domain.user.entity;

/*
    회원 가입 경로 users.provider 컬럼(VARCHAR(20))에 상수 이름 문자열이 그대로 저장 (LOCAL | GOOGLE)

    LOCAL  : 이메일/비밀번호 가입 (password_hash 존재, provider_id NULL)
    GOOGLE : 구글 소셜 가입 (password_hash = NULL, provider_id 존재)

    다른 소셜 제공자를 추가한다면 이 enum에 상수를 추가하면 됨
 */
public enum Provider {
    LOCAL,
    GOOGLE
}
