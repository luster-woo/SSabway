package com.ssafy.ssabway.domain.route.dto.response;

import java.util.List;

/*
    경로 하나. 프론트의 추천 경로 카드 하나에 대응

    transferCount는 segments.size() - 1로 서버가 계산 (환승 횟수)

    "빠른 길" / "환승 없음" 배지는 프론트가 판단한다.
    (totalTime 최솟값 / transferCount == 0)
 */
public record RouteResponse(
        String firstStartStation,
        String firstStartStationKor,
        String lastEndStation,
        String lastEndStationKor,
        int totalTime,
        int payment,
        int transferCount,
        List<RouteSegmentResponse> segments
) {}