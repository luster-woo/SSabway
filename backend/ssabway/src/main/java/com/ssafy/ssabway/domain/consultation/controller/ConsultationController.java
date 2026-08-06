package com.ssafy.ssabway.domain.consultation.controller;

import com.ssafy.ssabway.domain.consultation.dto.response.*;
import com.ssafy.ssabway.domain.consultation.service.ConsultationService;
import com.ssafy.ssabway.global.common.ApiResponse;
import com.ssafy.ssabway.global.common.PageResponse;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    /*
        진행 중인 상담의 사용자 정보(이메일·출발지·목적지·언어).

        ⚠️ 아래 GET /consultations?id= 과 다른 API 다. 그쪽은 종료된 상담의
           요약·녹취를 주고, 이쪽은 상담방 화면이 쓴다. 경로가 헷갈리기 쉬우니
           수정할 때 어느 쪽인지 확인할 것.
     */
    @GetMapping("/consultations/{consultationId}")
    public ResponseEntity<ApiResponse<ConsultationInfoResponse>> getInfo(
            @AuthenticationPrincipal Long staffId,
            @PathVariable Long consultationId) {

        return ResponseEntity.ok(
                ApiResponse.ok("조회에 성공하였습니다.",
                        consultationService.getInfo(staffId, consultationId)));
    }

    // 담당 상담 요청자의 현재 위치(currentNodeId) 조회
    @GetMapping("/consultations/{consultationId}/location")
    public ResponseEntity<ApiResponse<ConsultationLocationResponse>> getLocation(
            @AuthenticationPrincipal Long staffId,
            @PathVariable Long consultationId) {

        return ResponseEntity.ok(
                ApiResponse.ok("위치 조회에 성공하였습니다.",
                        consultationService.getLocation(staffId, consultationId)));
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
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(
                ApiResponse.ok("조회에 성공하였습니다.",
                        consultationService.getHistory(staffId, page, email, from, to)));
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