package com.ssafy.ssabway.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.s3.S3Client;

// 테스트용 S3Client 빈

@Configuration
public class S3Config {

    @Bean
    public S3Client s3Client() {
        return S3Client.create();
    }
}