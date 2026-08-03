package com.ssafy.ssabway.domain.navigation.controller;

import com.ssafy.ssabway.domain.navigation.dto.request.RouteRequest;
import com.ssafy.ssabway.domain.navigation.dto.response.RouteResponse;
import com.ssafy.ssabway.domain.navigation.service.NavigationService;
import com.ssafy.ssabway.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/routes")
@RequiredArgsConstructor
public class NavigationController {

    private final NavigationService navigationService;

    // 표지판 인식 결과를 출발지로 삼아, 개찰구까지의 역 내 경로를 돌려준다.
    // 교통카드가 준비되지 않았으면 편의점·ATM 등 들러야 할 곳을 경유지로 넣는다.
    @PostMapping("/navi")
    public ResponseEntity<ApiResponse<RouteResponse>> findRoute(
            @Valid @RequestBody RouteRequest request) {

        RouteResponse response = navigationService.findRoute(request);

        return ResponseEntity.ok(ApiResponse.ok("경로를 안내하겠습니다.", response));
    }
}
