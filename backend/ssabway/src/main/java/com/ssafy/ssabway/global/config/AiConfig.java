package com.ssafy.ssabway.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/*
    표지판 인식 AI 서버 호출 전용 RestClient

    read 타임아웃을 넉넉히 잡는다. CPU 추론(YOLO 검출 + ResNet 분류)이라
    순간 부하에서 수 초가 걸리고, 컨테이너가 막 뜬 직후에는 모델 로딩까지
    겹친다. 다만 무제한은 안 된다 — AI 가 멈추면 요청 스레드가 계속 대기하다
    스레드 풀이 고갈되어 길찾기·상담까지 함께 멈춘다. (OdsayConfig 와 같은 이유)

    프론트는 20초에 끊으므로 그보다 짧게 두어 서버가 먼저 정리하게 한다.
 */
@Configuration
public class AiConfig {

    @Bean
    public RestClient aiRestClient(
            @Value("${ai.base-url}") String baseUrl,
            @Value("${ai.connect-timeout}") long connectTimeout,
            @Value("${ai.read-timeout}") long readTimeout) {

        /*
            HTTP/1.1 로 고정한다. 빼면 표지판 인식이 전부 422 로 실패한다.

            JDK HttpClient 는 기본이 HTTP/2 라, 평문(h2c) 연결에 업그레이드
            헤더를 얹어 보낸다.
                Connection: Upgrade, HTTP2-Settings
                Upgrade: h2c
            AI 서버의 uvicorn 은 h2c 를 지원하지 않아 이 요청을 거부하고
            (로그: "Unsupported upgrade request") 본문을 읽지 못해
            "field required: file" 로 422 를 낸다. 파일은 정상적으로 실려
            있는데도 그렇다.

            같은 JDK HttpClient 를 쓰는 ODsay 는 HTTPS 라 ALPN 으로 협상해
            이 문제가 없고, signaling 은 Tomcat 이라 업그레이드 요청을 무시하고
            정상 처리한다. 평문 + uvicorn 조합에서만 터진다.
         */
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
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
