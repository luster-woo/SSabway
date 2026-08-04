package com.ssafy.ssabway.domain.route.client;

import com.ssafy.ssabway.global.common.Language;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/*
    ODsay 대중교통 길찾기 호출 담당
    응답을 그대로 반환하고 우리 형식으로의 변환은 서비스가 담당

 */
@Slf4j
@Component
public class OdsayClient {

    private static final String PATH = "/searchPubTransPathT";

    // SearchPathType: 0-모두(기본), 1-지하철, 2-버스
    // 1로 고정해 버스 경로를 받아서 버리는 낭비를 없앰
    private static final int SUBWAY_ONLY = 1;

    private final RestClient odsayRestClient;
    private final String apiKey;

    public OdsayClient(RestClient odsayRestClient, @Value("${odsay.api-key}") String apiKey) {
        this.odsayRestClient = odsayRestClient;
        this.apiKey = apiKey;
    }

    public OdsayRouteResponse searchSubwayPath(Language language,
                                               double startX, double startY,
                                               double endX, double endY) {
        try {
            OdsayRouteResponse response = odsayRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(PATH)
                            .queryParam("apiKey", "{apiKey}")
                            .queryParam("SX", startX)
                            .queryParam("SY", startY)
                            .queryParam("EX", endX)
                            .queryParam("EY", endY)
                            .queryParam("SearchPathType", SUBWAY_ONLY)
                            .queryParam("lang", toOdsayLang(language))
                            .build(apiKey))
                    .retrieve()
                    .body(OdsayRouteResponse.class);

            if (response == null || response.result() == null) {
                /*
                    ODsay는 실패 시 result 대신 error를 주는데 형태가 일정하지 않음
                      인증 실패   {"error":[{"code":"500","message":"..."}]}   배열
                      정류장 없음 {"error":{"code":5,"msg":"..."}}              객체
                    배열/객체가 갈리고 필드명(message/msg)도 달라 구조로 원인을 판별 블가

                    원인 판별을 포기하고 404로 통일
                    result가 없는 경우 대부분이 경로 없음이고,
                    설정 문제(키·IP·쿼터)는 배포 후 거의 발생하지 않으며 아래 로그에 원인이 그대로 남게 됨

                 */
                log.warn("ODsay 경로 탐색 실패: {} - error={}",
                        ErrorCode.SUBWAY_ROUTE_NOT_FOUND.name(),
                        response == null ? "응답 없음" : response.error());

                throw new BusinessException(ErrorCode.SUBWAY_ROUTE_NOT_FOUND);
            }

            return response;

        } catch (RestClientException e) {
            // 타임아웃, 연결 실패, 4xx/5xx가 모두 여기로 온다.
            // BusinessException은 RestClientException의 자식이 아니므로
            // 위에서 던진 예외가 여기 삼켜지지 않는다
            log.error("ODsay 호출 실패: {}", ErrorCode.EXTERNAL_API_ERROR.name(), e);
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }

    private int toOdsayLang(Language language) {
        return switch (language) {
            case KO -> 0;
            case EN -> 1;
            case JA -> 2;
            case ZH -> 3;
        };
    }
}