package com.ssafy.ssabway_webrtc.domain.admin.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AdminDashboardServiceTest {

    private final AdminDashboardService adminDashboardService = new AdminDashboardService();

    @Test
    void returnsInitialDashboardSummary() {
        var result = adminDashboardService.getSummary();

        assertThat(result.waitingConsultations()).isZero();
        assertThat(result.activeConsultations()).isZero();
        assertThat(result.registeredUsers()).isZero();
        assertThat(result.generatedAt()).isNotNull();
    }
}
