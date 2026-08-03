package com.ssafy.ssabway.domain.consultation.controller;

import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationDetailResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.service.ConsultationService;
import com.ssafy.ssabway.global.common.ApiResponse;
import com.ssafy.ssabway.global.common.PageResponse;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staffs")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;

    @GetMapping("/waiting")
    public ResponseEntity<ApiResponse<PageResponse<WaitingResponse>>> getWaitingList(
            @AuthenticationPrincipal Long staffId,
            @RequestParam(defaultValue = "1") @Min(1) int page) {

        return ResponseEntity.ok(
                ApiResponse.ok("대기 목록 조회 성공", consultationService.getWaitingList(staffId, page)));
    }

    @GetMapping("/consultations")
    public ResponseEntity<ApiResponse<ConsultationDetailResponse>> getDetail(
            @AuthenticationPrincipal Long staffId,
            @RequestParam Long id) {

        return ResponseEntity.ok(
                ApiResponse.ok("조회에 성공하였습니다.", consultationService.getDetail(staffId, id)));
    }
}
