package com.ssafy.ssabway.domain.consultation.controller;

import com.ssafy.ssabway.domain.consultation.dto.request.ConsultationCreateRequest;
import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationCreateResponse;
import com.ssafy.ssabway.domain.consultation.service.ConsultationService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
public class UserConsultationController {

    private final ConsultationService consultationService;

    // 로그인 사용자의 상담 요청을 WAITING 상태로 등록한다.
    @PostMapping
    public ResponseEntity<ApiResponse<ConsultationCreateResponse>> requestConsultation(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ConsultationCreateRequest request) {

        ConsultationCreateResponse response =
                consultationService.requestConsultation(userId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("상담 요청이 등록되었습니다.", response));
    }
}