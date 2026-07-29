package com.ssafy.ssabway.global.common;

/*
    서비스가 지원하는 언어 (ISO 639-1)

    규격 문서는 소문자로 표기하지만, DB에는 상수 이름이 그대로 저장되므로
    @Enumerated(EnumType.STRING) 기본 동작에 맞춰 대문자로 통일

    users.language 와 edge_translations.language_code 가 같은 타입을 사용하도록 공통 패키지에 위치
 */
public enum Language {
    KO,
    EN,
    JA,
    ZH
}
