package com.ssafy.ssabway.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "잘못된 형식의 요청 값입니다."), // 400
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), // 401
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."), // 403
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 URL입니다."), // 404
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "허용되지 않은 메서드입니다."), // 405
    PAYLOAD_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "용량이 초과되었습니다."), // 413
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "허용되지 않는 형식입니다."), // 415
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."), // 500

    // 사용자
    EMAIL_DUPLICATED(HttpStatus.CONFLICT, "중복된 이메일입니다."), // 409
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "요청 횟수를 초과했습니다."),  // 429
    EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "인증 메일 발송에 실패했습니다."),   // 500

    // 상담
    CONSULTATION_DUPLICATED(HttpStatus.CONFLICT, "중복된 상담 요청입니다."); // 409

    private final HttpStatus httpStatus;
    private final String message;

}
