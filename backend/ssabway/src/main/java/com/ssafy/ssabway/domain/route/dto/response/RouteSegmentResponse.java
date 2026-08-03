package com.ssafy.ssabway.domain.route.dto.response;

import com.ssafy.ssabway.domain.route.entity.SubwayLane;

/*
    한 번 타고 내리는 구간. 환승이 없으면 1개, 1회 환승이면 2개

    wayCode(1-상행, 2-하행) -> 실내 안내의 시작점
    segments[0].wayCode가 대구역의 어느 승강장으로 가야 하는지 결정
 */
public record RouteSegmentResponse(
        SubwayLane lane,
        String laneName,
        Integer wayCode,
        String direction,       // 방면 종점명
        String startStation,
        String endStation,
        int stationCount,
        int sectionTime
) {}