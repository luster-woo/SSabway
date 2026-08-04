package com.ssafy.ssabway.domain.route.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/*
    ODsay 응답 중 우리가 쓰는 필드만 담는 레코드
    JSON 중첩 구조를 그대로 중첩 record로 옮겨 대응 관계가 보이게 함.

   ignoreUnknown = true 필수!!
   ODsay 응답에는 매핑하지 않은 필드가 수십 개 있어서 이게 없으면 역직렬화 실패함
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OdsayRouteResponse(Result result,  Object error)  {

    /*
        최상위. 실패 시 result 대신 error 키가 오므로 result == null 검사가
        곧 호출 실패 판단이 된다.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Result(List<Path> path) {}

    /*
        경로 하나. 같은 목적지라도 환승 조합에 따라 여러 개가 올 수 있음

        pathType: 1-지하철, 2-버스, 3-버스+지하철 (우리 서비스는 1만 사용)
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Path(int pathType, Info info, List<SubPath> subPath) {}

    /*
        경로 요약

        totalTime  분 단위
        payment    원 단위

        ⚠️ subwayTransitCount는 매핑하지 않았다. 환승 횟수가 아니라 "탑승 횟수"라서
           그대로 쓰면 1씩 밀린다. 환승 횟수는 지하철 구간 수 - 1로 계산한다.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Info(int totalTime, int payment,
                       String firstStartStation, String firstStartStationKor,
                       String lastEndStation, String lastEndStationKor) {}

    /*
        경로를 구성하는 이동 구간

        도보와 탑승이 번갈아 들어옴
        예) 도보 → 1호선 → 도보(환승통로) → 2호선 → 도보

        trafficType: 1-지하철, 2-버스, 3-도보
        이 값으로 걸러내기 전(지하철 경로만 받아오기 전)에 lane/startName에 접근하면 NPE가 난다.

        wayCode: 1-상행, 2-하행. 대구역의 어느 승강장으로 가야 하는지를 결정하는 값.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SubPath(int trafficType, int sectionTime, Integer stationCount,
                          List<Lane> lane,
                          String startName, String startNameKor,
                          String endName, String endNameKor,
                          Integer wayCode) {}

    /*
        노선 정보

        name       "대구 1호선", "대경선" 같은 표시 문자열
        subwayCode 41-1호선, 42-2호선, 43-3호선, 48-대경선
                   표시 문자열보다 안정적이므로 이 값으로 우리 enum에 매핑한다.
                   (버스 구간에는 없어 Integer)
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Lane(String name, String nameKor, Integer subwayCode) {}
}