package com.ssafy.ssabway.global.exception;

import com.ssafy.ssabway.global.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mail.MailException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

/*
    컨트롤러에서 빠져나온 예외를 잡아 ApiResponse 형태로 변환하는 전역 핸들러

    이 클래스가 처리하는 ErrorCode
      INVALID_INPUT_VALUE     400
      METHOD_NOT_ALLOWED      405
      UNSUPPORTED_MEDIA_TYPE  415
      RESOURCE_NOT_FOUND      404
      INTERNAL_SERVER_ERROR   500
      그 외 BusinessException이 들고 온 모든 ErrorCode (EMAIL_DUPLICATED 등)

    이 클래스가 처리하지 못하는 ErrorCode
      UNAUTHORIZED       401 - Security 필터에서 발생하므로 DispatcherServlet에 도달하지 않음
      FORBIDDEN          403 - 위와 동일
                               JWT 도입 시 AuthenticationEntryPoint / AccessDeniedHandler 별도 등록 필요
      CONTENT_TOO_LARGE  413 - 파일 업로드 기능 구현 시 MaxUploadSizeExceededException 핸들러 추가 필요
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /*
        의도적으로 발생시킨 비즈니스 예외
        ErrorCode에 정의된 상태코드로 응답하고, 서버 결함이 아니므로 warn 레벨
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e){
        ErrorCode errorCode = e.getErrorCode();
        log.warn("BusinessException : {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
        [INVALID_INPUT_VALUE 400]
        @Valid 검증 실패 시 발생
        위반된 필드가 여러 개일 수 있으므로 각 메시지를 쉼표로 이어 하나의 message로 변환
        DTO에 지정한 message 문구가 그대로 응답에 나가므로 사용자에게 보여줄 문구로 작성해야 함
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e){
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .collect(Collectors.joining(", "));

        log.warn("Validation failed: {} - {}", errorCode.name(), message);

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, message));
    }

    /*
       [INVALID_INPUT_VALUE 400]
       요청 본문을 읽을 수 없을 때 발생 (JSON 문법 오류, 필드 타입 불일치 등)
    */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotReadableException(HttpMessageNotReadableException e){
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        log.warn("Malformed request body: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
       [INVALID_INPUT_VALUE 400]
       쿼리 파라미터, 경로 변수의 형식이 잘못된 경우
       예: /users/exists?email=abc
    */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleHandlerMethodValidation(HandlerMethodValidationException e) {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        log.warn("파라미터 검증 실패: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
       [INVALID_INPUT_VALUE 400]
       필수 쿼리 파라미터가 아예 없는 경우
       예: /users/exists (email 없음)
    */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException e) {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        log.warn("필수 파라미터 누락: {} - {}", errorCode.name(), e.getParameterName());

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
       [INVALID_INPUT_VALUE 400]
       쿼리 파라미터의 타입이 맞지 않는 경우
       예: /staffs/blacklist?page=abc (int에 문자열)
    */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        log.warn("파라미터 타입 불일치: {} - {}", errorCode.name(), e.getName());

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
       [AI_IMAGE_REQUIRED 400]
       multipart 요청인데 필수 파트가 없는 경우
       예: POST /ai/signs/predict 에 image 파트 누락
    */
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingPart(MissingServletRequestPartException e) {
        ErrorCode errorCode = ErrorCode.AI_IMAGE_REQUIRED;
        log.warn("필수 파트 누락: {} - {}", errorCode.name(), e.getRequestPartName());

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
       [AI_IMAGE_TOO_LARGE 413]
       spring.servlet.multipart 한도를 넘긴 업로드.
       핸들러가 없으면 500 으로 떨어져 사용자가 원인을 알 수 없다.
    */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException e) {
        ErrorCode errorCode = ErrorCode.AI_IMAGE_TOO_LARGE;
        log.warn("업로드 크기 초과: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
        [METHOD_NOT_ALLOWED 405]
        URL은 매핑되지만 해당 HTTP 메서드를 지원하지 않을 때 발생
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        ErrorCode errorCode = ErrorCode.METHOD_NOT_ALLOWED;
        log.warn("Method not allowed: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
        [RESOURCE_NOT_FOUND 404]
        매핑되는 핸들러나 정적 리소스가 없을 때 발생
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException e) {
        ErrorCode errorCode = ErrorCode.RESOURCE_NOT_FOUND;
        log.warn("Resource not found: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
        [UNSUPPORTED_MEDIA_TYPE 415]
        요청의 Content-Type을 처리할 수 없을 때 발생
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException e) {
        ErrorCode errorCode = ErrorCode.UNSUPPORTED_MEDIA_TYPE;
        log.warn("Unsupported media type: {} - {}", errorCode.name(), e.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    // 메일 발송 실패 (SMTP 연결 실패, 타임아웃, 인증 오류 등)
    // 서버 버그가 아니라 외부 서버 문제이므로 별도 코드로 구분
    @ExceptionHandler(MailException.class)
    public ResponseEntity<ApiResponse<Void>> handleMailException(MailException e) {
        ErrorCode errorCode = ErrorCode.EMAIL_SEND_FAILED;
        log.error("메일 발송 실패: {}", errorCode.name(), e);

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }

    /*
        [INTERNAL_SERVER_ERROR 500]
        위에서 처리되지 않은 모든 예외
        예상하지 못한 상황이므로 스택트레이스를 error 레벨 설정
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        log.error("Unhandled exception: {}", errorCode.name(), e);

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }
}