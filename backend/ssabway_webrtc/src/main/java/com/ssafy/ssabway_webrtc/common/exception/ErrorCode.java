package com.ssafy.ssabway_webrtc.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST,
        "잘못된 형식의 요청 값입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED,
        "로그인이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN,
        "권한이 없습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND,
        "존재하지 않는 URL입니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED,
        "허용되지 않은 메서드입니다."),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        "지원하지 않는 형식입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR,
        "서버 오류가 발생했습니다."),
    ACCESS_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED,
        "액세스 토큰이 만료되었습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED,
        "유효하지 않은 토큰입니다."),

    // 상담
    CONSULTATION_NOT_FOUND(HttpStatus.NOT_FOUND,
        "상담 정보를 찾을 수 없습니다."),
    CONSULTATION_NOT_WAITING(HttpStatus.CONFLICT,
        "대기 중인 상담만 시작할 수 있습니다."),
    CONSULTATION_NOT_IN_PROGRESS(HttpStatus.CONFLICT,
        "진행 중인 상담이 아닙니다."),
    CONSULTATION_START_FAILED(HttpStatus.INTERNAL_SERVER_ERROR,
        "상담 시작 상태를 저장하지 못했습니다."),
    CONSULTATION_END_FAILED(HttpStatus.INTERNAL_SERVER_ERROR,
        "상담 종료 상태를 저장하지 못했습니다."),

    // 상담 오류
    CONSULTATION_CANCEL_NOT_ALLOWED(HttpStatus.CONFLICT,
        "대기 중인 상담만 취소할 수 있습니다."),
    CONSULTATION_CANCEL_FAILED(HttpStatus.CONFLICT,
        "상담 요청을 취소하지 못했습니다."),

    // OpenVidu 세션
    INVALID_SESSION_ID(HttpStatus.BAD_REQUEST,
        "잘못된 상담 세션 ID입니다."),
    OPENVIDU_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND,
        "존재하지 않는 화상 상담 세션입니다."),
    OPENVIDU_COMMUNICATION_FAILED(HttpStatus.BAD_GATEWAY,
        "화상 연결 서버와 통신할 수 없습니다."),

    // 참여자 연결
    INVALID_PARTICIPANT_ROLE(HttpStatus.BAD_REQUEST,
        "참여자 역할은 USER 또는 STAFF만 가능합니다."),
    PARTICIPANT_ALREADY_CONNECTED(HttpStatus.CONFLICT,
        "해당 역할의 참여자가 이미 연결되어 있습니다."),
    PARTICIPANT_LIMIT_EXCEEDED(HttpStatus.CONFLICT,
        "화상 상담은 사용자 1명과 역무원 1명만 참여할 수 있습니다."),
    CONNECTION_METADATA_INVALID(HttpStatus.INTERNAL_SERVER_ERROR,
        "참여자 연결 정보를 확인할 수 없습니다."),

    // 녹음
    RECORDING_NOT_FOUND(HttpStatus.NOT_FOUND,
        "상담 녹음 정보를 찾을 수 없습니다."),
    RECORDING_STATUS_INVALID(HttpStatus.CONFLICT,
        "현재 상태에서는 녹음을 처리할 수 없습니다."),
    SESSION_RECORDING_MISMATCH(HttpStatus.CONFLICT,
        "상담 세션과 녹음 정보가 일치하지 않습니다."),
    RECORDING_DOWNLOAD_FAILED(HttpStatus.BAD_GATEWAY,
        "OpenVidu 녹음 파일을 다운로드할 수 없습니다."),
    RECORDING_UPLOAD_FAILED(HttpStatus.BAD_GATEWAY,
        "녹음 파일을 S3에 업로드할 수 없습니다."),

    // 웹훅
    INVALID_WEBHOOK_REQUEST(HttpStatus.BAD_REQUEST,
        "잘못된 OpenVidu 웹훅 요청입니다."),
    INVALID_WEBHOOK_SECRET(HttpStatus.UNAUTHORIZED,
        "유효하지 않은 웹훅 인증 정보입니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
