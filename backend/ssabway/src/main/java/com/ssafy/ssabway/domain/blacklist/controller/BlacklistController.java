package com.ssafy.ssabway.domain.blacklist.controller;

import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistRegisterRequest;
import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistReleaseRequest;
import com.ssafy.ssabway.domain.blacklist.dto.response.BlacklistResponse;
import com.ssafy.ssabway.domain.blacklist.service.BlacklistService;
import com.ssafy.ssabway.global.common.ApiResponse;
import com.ssafy.ssabway.global.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/staffs/blacklist")
public class BlacklistController {

    private final BlacklistService blacklistService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> register(
            @AuthenticationPrincipal Long staffId,
            @Valid @RequestBody BlacklistRegisterRequest request) {

        blacklistService.register(staffId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("블랙리스트에 등록되었습니다."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BlacklistResponse>>> getBlacklist(
            @AuthenticationPrincipal Long staffId,
            @RequestParam(defaultValue = "1") @Min(1) int page) {

        return ResponseEntity.ok(
                ApiResponse.ok("조회에 성공하였습니다.", blacklistService.getBlacklist(staffId, page)));
    }

    @PostMapping("/release")
    public ResponseEntity<ApiResponse<Void>> release(
            @AuthenticationPrincipal Long staffId,
            @Valid @RequestBody BlacklistReleaseRequest request) {

        blacklistService.release(staffId, request);

        return ResponseEntity.ok(ApiResponse.ok("블랙리스트 해제 성공"));
    }
}