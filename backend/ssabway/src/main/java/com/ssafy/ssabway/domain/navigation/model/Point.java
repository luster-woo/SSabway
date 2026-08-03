package com.ssafy.ssabway.domain.navigation.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/* 지도 좌표. SVG viewBox 기준이라 프론트가 변환 없이 그대로 쓴다 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Point(double x, double y) {

    public double distanceTo(Point other) {
        return Math.hypot(other.x - x, other.y - y);
    }
}
