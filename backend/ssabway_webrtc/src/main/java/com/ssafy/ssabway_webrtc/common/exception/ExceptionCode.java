package com.ssafy.ssabway_webrtc.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 공통 오류 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum ExceptionCode {

    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "잘못된 형식의 요청 값입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 URL입니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "허용되지 않은 메서드입니다."),
    PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "허용 용량을 초과했습니다."),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 형식입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),
    EMAIL_DUPLICATED(HttpStatus.CONFLICT, "중복된 이메일입니다."),
    CONSULTATION_DUPLICATED(HttpStatus.CONFLICT, "중복된 상담 요청입니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
