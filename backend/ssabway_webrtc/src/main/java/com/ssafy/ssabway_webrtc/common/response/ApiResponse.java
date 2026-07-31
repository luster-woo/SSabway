package com.ssafy.ssabway_webrtc.common.response;

import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;

public record ApiResponse<T>(
    boolean success,
    T data,
    String message
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(
            true,
            data,
            null
        );
    }

    public static <T> ApiResponse<T> ok(
        T data,
        String message
    ) {
        return new ApiResponse<>(
            true,
            data,
            message
        );
    }

    public static <T> ApiResponse<T> fail(
        String message
    ) {
        return new ApiResponse<>(
            false,
            null,
            message
        );
    }

    public static <T> ApiResponse<T> error(
        ErrorCode errorCode
    ) {
        return new ApiResponse<>(
            false,
            null,
            errorCode.getMessage()
        );
    }

    public static <T> ApiResponse<T> error(
        ErrorCode errorCode,
        String message
    ) {
        return new ApiResponse<>(
            false,
            null,
            message
        );
    }
}
