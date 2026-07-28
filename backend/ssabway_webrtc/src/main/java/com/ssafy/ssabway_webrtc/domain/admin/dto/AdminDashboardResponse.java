package com.ssafy.ssabway_webrtc.domain.admin.dto;

import java.time.LocalDateTime;

public record AdminDashboardResponse(
        long waitingConsultations,
        long activeConsultations,
        long registeredUsers,
        LocalDateTime generatedAt
) {
}
