package com.ssafy.ssabway.domain.route.controller;

import com.ssafy.ssabway.domain.route.dto.request.RouteSearchRequest;
import com.ssafy.ssabway.domain.route.dto.response.RouteSearchResponse;
import com.ssafy.ssabway.domain.route.service.RouteService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/routes")
public class RouteController {

    private final RouteService routeService;

    @PostMapping("/path")
    public ResponseEntity<ApiResponse<RouteSearchResponse>> searchPath(
            @Valid @RequestBody RouteSearchRequest request) {

        return ResponseEntity.ok(
                ApiResponse.ok("경로 탐색 완료", routeService.searchPath(request)));
    }
}