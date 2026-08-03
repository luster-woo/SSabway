package com.ssafy.ssabway.domain.route.dto.response;

import java.util.List;

/*
    경로들을 담는 리스트
 */
public record RouteSearchResponse(List<RouteResponse> path) {}