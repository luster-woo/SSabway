package com.ssafy.ssabway_webrtc.domain.admin.service;

import com.ssafy.ssabway_webrtc.domain.admin.dto.AdminDashboardResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AdminDashboardService {

    public AdminDashboardResponse getSummary() {
        // 각 도메인의 Repository가 추가되면 실제 집계 쿼리로 교체합니다.
        return new AdminDashboardResponse(0, 0, 0, LocalDateTime.now());
    }
}
