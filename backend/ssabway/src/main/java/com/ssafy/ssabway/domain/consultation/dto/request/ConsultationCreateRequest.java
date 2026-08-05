package com.ssafy.ssabway.domain.consultation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * GPS와 경로 탐색에서 확정된 출발역 및 도착역 정보입니다.
 *
 * 사용자 ID는 USER Access Token에서 가져오며,
 * 역무원은 출발역 ID를 기준으로 서버에서 결정합니다.
 */
public record ConsultationCreateRequest(

        @NotNull(message = "출발역 ID는 필수입니다.")
        @Positive(message = "출발역 ID는 양수여야 합니다.")
        Long stationId,

        @NotBlank(message = "출발역 이름은 필수입니다.")
        @Size(max = 255, message = "출발역 이름은 255자 이하여야 합니다.")
        String departure,

        @NotBlank(message = "도착역 이름은 필수입니다.")
        @Size(max = 255, message = "도착역 이름은 255자 이하여야 합니다.")
        String destination,

        @NotBlank(message = "현재 위치 노드는 필수입니다.")
        @Size(max = 255, message = "현재 위치 노드는 255자 이하여야 합니다.")
        String currentNodeId
) {
}