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
    CONTENT_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "용량이 초과되었습니다."), // 413
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "허용되지 않는 형식입니다."), // 415
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."), // 500

    // 사용자
    EMAIL_DUPLICATED(HttpStatus.CONFLICT, "중복된 이메일입니다."), // 409
    EMAIL_SEND_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "발송 횟수를 초과했습니다."),  // 429
    VERIFICATION_ATTEMPT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "인증 시도 횟수를 초과했습니다."),   //429
    EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "인증 메일 발송에 실패했습니다."),   // 500
    VERIFICATION_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "인증 코드가 일치하지 않습니다."),    // 400
    VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "인증 코드가 만료되었습니다. 다시 요청해주세요."),    // 400
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "이메일 인증이 필요합니다."),   // 400
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),   // 401
    SOCIAL_LOGIN_REQUIRED(HttpStatus.UNAUTHORIZED, "소셜 계정으로 가입된 이메일입니다. 소셜 로그인을 이용해주세요."),  // 401
    ACCESS_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "액세스 토큰이 만료되었습니다."),  // 401
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),   // 401
    REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 만료되었습니다. 다시 로그인해주세요."),    // 401
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."),  // 401
    PASSWORD_MISMATCH(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다."), // 401
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 사용자입니다."),    // 404
    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 구글 토큰입니다."), // 401
    LOCAL_LOGIN_REQUIRED(HttpStatus.UNAUTHORIZED, "이미 가입된 이메일입니다. 일반 로그인을 이용해주세요."), // 401
    STAFF_NOT_FOUND(HttpStatus.NOT_FOUND, "출발역을 담당하는 역무원이 존재하지 않습니다."), // 404

    // 블랙리스트
    BLACKLIST_DUPLICATED(HttpStatus.CONFLICT, "이미 블랙리스트에 등록된 사용자입니다."),
    BLACKLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "블랙리스트에 등록되지 않은 사용자입니다."),

    // 상담
    CONSULTATION_DUPLICATED(HttpStatus.CONFLICT, "중복된 상담 요청입니다."), // 409
    CONSULTATION_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 상담입니다."), //404
    CONSULTATION_BLOCKED(HttpStatus.FORBIDDEN, "해당 역의 화상 상담 이용이 제한된 사용자입니다."), // 403
    CONSULTATION_ALREADY_ACCEPTED(HttpStatus.CONFLICT, "이미 수락되었거나 처리된 상담입니다."),
    CONSULTATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 상담을 수락할 권한이 없습니다."),

    WEBRTC_SERVER_ERROR(HttpStatus.BAD_GATEWAY, "화상 연결 서버 처리에 실패했습니다."),

    // 역 내 길안내
    NAV_NODE_NOT_FOUND(HttpStatus.BAD_REQUEST, "존재하지 않는 지점입니다."), // 400
    NAV_NEEDS_REQUIRED(HttpStatus.BAD_REQUEST, "무엇이 필요한지 함께 보내주세요."), // 400
    NAV_ROUTE_NOT_FOUND(HttpStatus.NOT_FOUND, "이동할 수 있는 경로를 찾지 못했습니다."), // 404
    NAV_NO_STEP_FREE_ROUTE(HttpStatus.NOT_FOUND, "계단을 이용하지 않고 갈 수 있는 경로가 없습니다."), // 404
    NAV_GRAPH_NOT_LOADED(HttpStatus.SERVICE_UNAVAILABLE, "길안내 데이터가 준비되지 않았습니다."); // 503

    private final HttpStatus httpStatus;
    private final String message;

}
