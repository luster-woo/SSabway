package com.ssafy.ssabway_webrtc.domain.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.openvidu.java.client.OpenVidu;

@Configuration
public class OpenViduConfig {

    @Bean
    public OpenVidu openVidu(
        @Value("${openvidu.url}") String url,
        @Value("${openvidu.secret}") String secret
    ){
        return new OpenVidu(url, secret);
    }
}
