package com.ssafy.ssabway.global.common;


import com.fasterxml.jackson.annotation.JsonInclude;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.Getter;

/*
    API 공통 응답
    모든 응답 success / message / data 형태로 직렬화

    데이터 있음: { "success": true, "message": "...", "data": { ... } }
    데이터 없음: { "success": true, "message": "..." }
    실패:       { "success": false, "message": "중복된 이메일입니다." }

    @JsonInclude(NON_NULL) : 값이 null인 필드는 JSON에서 아예 빠져서 직렬화시킴
    따라서 data를 넘기지 않은 응답에는 data 키가 나타나지 않음
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;

    public ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    // 데이터를 함께 반환하는 성공 응답
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    // 데이터 없이 결과만 알리는 성공 응답
    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, message, null);
    }

    // ErrorCode의 기본 메시지를 사용하는 실패 응답
    public static ApiResponse<Void> error(ErrorCode errorCode) {
        return new ApiResponse<>(false, errorCode.getMessage(), null);
    }

    // 기본 메시지 대신 상황별 메시지를 담는 실패 응답
    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
