package com.ssafy.ssabway.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/*
    ODsay 호출 전용 RestClient

    타임아웃이 매우 중요!!
    지정하지 않으면 무제한이라 ODsay가 응답하지 않을 때 요청 스레드가 계속 대기
    요청이 몰리면 스레드 풀이 고갈되어 길찾기와 무관한 API까지 함께 멈출 수 있음.
 */
@Configuration
public class OdsayConfig {

    @Bean
    public RestClient odsayRestClient(
            @Value("${odsay.base-url}") String baseUrl,
            @Value("${odsay.connect-timeout}") long connectTimeout,
            @Value("${odsay.read-timeout}") long readTimeout) {

        // connect 타임아웃은 JDK HttpClient에, read 타임아웃은 요청 팩토리에 설정한다
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeout))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeout));

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}