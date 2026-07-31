package com.ssafy.ssabway_webrtc.common.exception;

import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 서비스에서 의도적으로 발생시킨 비즈니스 예외를 처리합니다.
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleBusinessException(
        BusinessException exception
    ) {
        ErrorCode errorCode =
            exception.getErrorCode();

        log.warn(
            "BusinessException: {} - {}",
            errorCode.name(),
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // DTO의 @Valid 검증 실패 메시지를 하나로 합쳐 반환합니다.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleValidationException(
        MethodArgumentNotValidException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.INVALID_INPUT_VALUE;

        String message = exception
            .getBindingResult()
            .getFieldErrors()
            .stream()
            .map(
                DefaultMessageSourceResolvable
                    ::getDefaultMessage
            )
            .collect(Collectors.joining(", "));

        log.warn(
            "Validation failed: {}",
            message
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(
                ApiResponse.error(
                    errorCode,
                    message
                )
            );
    }

    // JSON 문법 오류나 요청 필드 타입 불일치를 처리합니다.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleNotReadableException(
        HttpMessageNotReadableException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.INVALID_INPUT_VALUE;

        log.warn(
            "Malformed request body: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 경로 변수나 요청 파라미터의 검증 실패를 처리합니다.
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleHandlerMethodValidation(
        HandlerMethodValidationException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.INVALID_INPUT_VALUE;

        log.warn(
            "Request parameter validation failed: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 숫자 경로 변수에 문자열이 전달되는 등의 타입 오류를 처리합니다.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleTypeMismatchException(
        MethodArgumentTypeMismatchException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.INVALID_INPUT_VALUE;

        log.warn(
            "Request parameter type mismatch: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 필수 쿼리 파라미터가 없는 요청을 처리합니다.
    @ExceptionHandler(
        MissingServletRequestParameterException.class
    )
    public ResponseEntity<ApiResponse<Void>>
    handleMissingParameter(
        MissingServletRequestParameterException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.INVALID_INPUT_VALUE;

        log.warn(
            "Missing request parameter: {}",
            exception.getParameterName()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 지원하지 않는 HTTP 메서드 요청을 처리합니다.
    @ExceptionHandler(
        HttpRequestMethodNotSupportedException.class
    )
    public ResponseEntity<ApiResponse<Void>>
    handleMethodNotSupported(
        HttpRequestMethodNotSupportedException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.METHOD_NOT_ALLOWED;

        log.warn(
            "Method not allowed: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 존재하지 않는 API 주소 요청을 처리합니다.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>>
    handleNoResourceFound(
        NoResourceFoundException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.RESOURCE_NOT_FOUND;

        log.warn(
            "Resource not found: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 지원하지 않는 Content-Type 요청을 처리합니다.
    @ExceptionHandler(
        HttpMediaTypeNotSupportedException.class
    )
    public ResponseEntity<ApiResponse<Void>>
    handleMediaTypeNotSupported(
        HttpMediaTypeNotSupportedException exception
    ) {
        ErrorCode errorCode =
            ErrorCode.UNSUPPORTED_MEDIA_TYPE;

        log.warn(
            "Unsupported media type: {}",
            exception.getMessage()
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // OpenVidu 서버 연결 실패를 외부 서버 통신 오류로 처리합니다.
    @ExceptionHandler({
        OpenViduJavaClientException.class,
        OpenViduHttpException.class
    })
    public ResponseEntity<ApiResponse<Void>>
    handleOpenViduException(
        Exception exception
    ) {
        ErrorCode errorCode =
            ErrorCode.OPENVIDU_COMMUNICATION_FAILED;

        log.error(
            "OpenVidu communication failed",
            exception
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }

    // 처리되지 않은 예외는 내부 서버 오류로 반환합니다.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>>
    handleException(Exception exception) {
        ErrorCode errorCode =
            ErrorCode.INTERNAL_SERVER_ERROR;

        log.error(
            "Unhandled exception",
            exception
        );

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode));
    }
}
