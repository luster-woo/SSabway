package com.ssafy.ssabway.domain.blacklist.controller;

import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistRegisterRequest;
import com.ssafy.ssabway.domain.blacklist.service.BlacklistService;
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
}