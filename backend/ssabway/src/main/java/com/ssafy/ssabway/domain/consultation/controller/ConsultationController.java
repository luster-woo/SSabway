package com.ssafy.ssabway.domain.consultation.controller;

import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationAcceptResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationDetailResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.HistoryResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.service.ConsultationService;
import com.ssafy.ssabway.global.common.ApiResponse;
import com.ssafy.ssabway.global.common.PageResponse;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PageResponse<HistoryResponse>>> getHistory(
            @AuthenticationPrincipal Long staffId,
            @RequestParam(defaultValue = "1") @Min(1) int page) {

        return ResponseEntity.ok(
                ApiResponse.ok("조회에 성공하였습니다.", consultationService.getHistory(staffId, page)));
    }

    @PostMapping("/consultations/{consultationId}/accept")
    public ResponseEntity<ApiResponse<ConsultationAcceptResponse>>
    acceptConsultation(
            @PathVariable Long consultationId,
            @AuthenticationPrincipal Long staffId
    ) {
        ConsultationAcceptResponse response =
                consultationService.acceptConsultation(
                        consultationId,
                        staffId
                );

        return ResponseEntity.ok(
                ApiResponse.ok("상담을 수락했습니다.", response)
        );
    }
}